use crate::{
    configuration::get_configuration,
    handlers::{health_check, index, index_playground, index_ws},
    schema::{MutationRoot, QueryRoot, SubscriptionRoot, RoomEvent},
    types::Storage,
};
use actix_cors::Cors;

use actix_web::{
    guard, middleware,
    web::{self, Data},
    App, HttpResponse, HttpServer,
};
use async_graphql::Schema;
use env_logger::Env;
use log::{info, warn, debug};

mod configuration;
mod domain;
mod handlers;
mod schema;
mod simple_broker;
mod types;

use std::{collections::HashMap, sync::Arc, time::Duration as StdDuration};
use tokio::sync::Mutex;
use uuid::Uuid;

use prometheus::{Encoder, TextEncoder, Registry, IntCounter, IntGauge};

/// Spawn a background task that periodically prunes inactive rooms.
///
/// - `check_interval` : how often to scan for stale rooms (use `StdDuration`)
/// - `room_ttl` : rooms inactive for longer than this will be removed
/// - metrics/counters are cloned into the task so it can update them
fn spawn_room_cleanup_task(
    storage: Storage,
    check_interval: StdDuration,
    room_ttl: StdDuration,
    rooms_evicted: IntCounter,
    rooms_scanned: IntCounter,
    rooms_current: IntGauge,
) {
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(check_interval);

        info!(
            "Room cleanup task started (tick = {:?}, ttl = {:?})",
            check_interval, room_ttl
        );

        loop {
            ticker.tick().await;

            info!("Room cleanup tick: scanning rooms for inactivity...");

            // Snapshot the map under lock quickly
            let snapshot: Vec<(Uuid, crate::domain::room::Room)> = {
                let guard = storage.lock().await;
                guard
                    .iter()
                    .map(|(id, room)| (*id, room.clone()))
                    .collect()
            };

            let total_seen = snapshot.len();
            rooms_current.set(total_seen as i64);
            rooms_scanned.inc_by(total_seen as u64);

            let stale_ids: Vec<Uuid> = snapshot
                .into_iter()
                .filter_map(|(id, room)| {
                    if !room.is_safe_to_remove() {
                        return None;
                    }
                    if room.is_inactive(room_ttl) {
                        Some(id)
                    } else {
                        None
                    }
                })
                .collect();

            if stale_ids.is_empty() {
                debug!("Room cleanup: no stale rooms found this tick.");
                continue;
            }

            info!("Room cleanup: found {} stale room(s) to remove.", stale_ids.len());

            for id in stale_ids {
                if let Some(expired_room) = {
                    let mut guard = storage.lock().await;
                    guard.remove(&id)
                } {
                    info!(
                        "Room cleanup: removing stale room {} (name: {:?}, users: {})",
                        id,
                        expired_room.name,
                        expired_room.users.len()
                    );

                    let event = RoomEvent {
                        room_id: id,
                        event_type: "ROOM_EXPIRED".to_string(),
                        target_user_id: None,
                        room: expired_room.get_room(),
                    };

                    crate::simple_broker::SimpleBroker::publish(event);

                    rooms_evicted.inc();
                    info!("Room cleanup: published ROOM_EXPIRED for room {}", id);
                } else {
                    warn!(
                        "Room cleanup: attempted to remove stale room {}, but it was not found (race?).",
                        id
                    );
                }
            }
        }
    });
}

#[tokio::main]
async fn main() -> std::io::Result<()> {
    println!("Hello, world! This is the server for Summit Planning Poker");

    let env = Env::default().filter_or("RUST_LOG", "planning_poker_server=info,actix_web=trace");
    env_logger::init_from_env(env);

    let settings = get_configuration().expect("Failed to read settings.");
    let server_address = settings.get_server_address();

    let storage: Storage = Arc::new(Mutex::new(HashMap::new()));

    // ----- Prometheus setup -----
    let registry = Registry::new();

    let rooms_evicted = IntCounter::new("rooms_evicted_total", "Total rooms evicted by cleanup").unwrap();
    let rooms_scanned = IntCounter::new("rooms_scanned_total", "Total rooms scanned by cleanup").unwrap();
    let rooms_current = IntGauge::new("rooms_current", "Current number of rooms in memory").unwrap();

    registry.register(Box::new(rooms_evicted.clone())).ok();
    registry.register(Box::new(rooms_scanned.clone())).ok();
    registry.register(Box::new(rooms_current.clone())).ok();

    let registry = Arc::new(registry);

    // Spawn the cleanup task: check every 30 minutes, evict rooms idle > 8 days
    spawn_room_cleanup_task(
        storage.clone(),
        StdDuration::from_secs(60 * 30),
        StdDuration::from_secs(8 * 24 * 60 * 60),
        rooms_evicted.clone(),
        rooms_scanned.clone(),
        rooms_current.clone(),
    );

    let schema = Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)
        .data(storage.clone())
        .finish();

    println!("Playground: http://{}", server_address);

    // Expose /metrics endpoint and GraphQL endpoints
    HttpServer::new(move || {
        let registry = registry.clone();

        App::new()
            .app_data(Data::new(schema.clone()))
            .wrap(Cors::permissive())
            .wrap(middleware::Logger::default())
            .service(
                web::resource("/metrics").route(web::get().to(move || {
                    let registry = registry.clone();
                    async move {
                        let encoder = TextEncoder::new();
                        let metric_families = registry.gather();
                        let mut buffer = Vec::new();
                        encoder.encode(&metric_families, &mut buffer).unwrap();
                        HttpResponse::Ok()
                            .content_type(encoder.format_type())
                            .body(buffer)
                    }
                })),
            )
            .service(web::resource("/").guard(guard::Post()).to(index))
            .service(
                web::resource("/")
                    .guard(guard::Get())
                    .guard(guard::Header("upgrade", "websocket"))
                    .to(index_ws),
            )
            .service(web::resource("/").guard(guard::Get()).to(index_playground))
            .service(
                web::resource("/health_check")
                    .guard(guard::Get())
                    .to(health_check),
            )
    })
    .bind(server_address)?
    .run()
    .await
}
