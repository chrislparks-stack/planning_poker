use crate::{
    configuration::get_configuration,
    handlers::{health_check, index, index_playground, index_ws},
    schema::{MutationRoot, QueryRoot, RoomEvent, SubscriptionRoot},
    types::Storage,
};
use actix_cors::Cors;
use actix_web::{
    App, HttpResponse, HttpServer, guard, middleware,
    web::{self, Data},
};
use async_graphql::Schema;
use env_logger::Env;
use log::{debug, info, warn};

mod configuration;
mod domain;
mod giphy;
mod handlers;
mod schema;
mod simple_broker;
mod types;

use std::env;
use std::{collections::HashMap, sync::Arc, time::Duration as StdDuration};
use tokio::sync::Mutex;
use uuid::Uuid;

use prometheus::{Encoder, IntCounter, IntGauge, Registry, TextEncoder};
use sysinfo::{Pid, System};

#[derive(Clone)]
struct CleanupMetrics {
    rooms_evicted: IntCounter,
    rooms_scanned: IntCounter,
    rooms_current: IntGauge,
    rooms_total_bytes_estimate: IntGauge,
    rooms_avg_bytes_estimate: IntGauge,
}

#[derive(Clone)]
struct HeartbeatMetrics {
    total_users: IntGauge,
    avg_users_per_room: IntGauge,
    process_memory_mib: IntGauge,
    process_cpu_percent_x100: IntGauge,
    total_chat_messages: IntGauge,
    avg_chat_messages_per_room: IntGauge,
    total_chat_memory_bytes: IntGauge,
    avg_chat_memory_per_room: IntGauge,
    total_room_bytes: IntGauge,
    avg_room_bytes: IntGauge,
}

fn http_request_kind(method: &str, path: &str, websocket: bool) -> &'static str {
    match (method, path, websocket) {
        ("OPTIONS", _, _) => "cors_preflight",
        ("GET", "/", true) => "graphql_websocket",
        ("POST", "/", _) => "graphql_http",
        ("GET", "/", _) => "graphql_playground",
        ("GET", "/health_check", _) => "health_check",
        ("GET", "/metrics", _) => "metrics",
        ("GET", path, _) if path.starts_with("/giphy/") => "giphy_proxy",
        _ => "http",
    }
}

fn http_outcome(status: u16) -> &'static str {
    match status {
        101 => "upgraded",
        200..=299 => "success",
        400..=499 => "client_error",
        500..=599 => "server_error",
        _ => "other",
    }
}

fn spawn_room_cleanup_task(
    storage: Storage,
    check_interval: StdDuration,
    room_ttl: StdDuration,
    metrics: CleanupMetrics,
) {
    #[derive(Debug, Clone)]
    struct RoomScanInfo {
        id: Uuid,
        name: Option<String>,
        last_active: chrono::DateTime<chrono::Utc>,
        estimated_bytes: usize,
    }

    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(check_interval);

        info!(
            "Room cleanup task started (tick = {:?}, ttl = {:?})",
            check_interval, room_ttl
        );

        loop {
            ticker.tick().await;
            info!("Room cleanup tick: scanning rooms for inactivity...");

            // Snapshot and analyze under lock
            let mut total_estimated_bytes: usize = 0;
            let mut stale_ids: Vec<Uuid> = Vec::new();
            let mut scan_infos: Vec<RoomScanInfo> = Vec::new();
            let total_seen;

            {
                debug!("cleanup: acquiring storage lock for snapshot");
                let mut guard = storage.lock().await;
                total_seen = guard.len();
                metrics.rooms_current.set(total_seen as i64);
                metrics.rooms_scanned.inc_by(total_seen as u64);

                const BASE_PER_ROOM: usize = 200;
                const PER_USER_BYTES: usize = 180;
                const PER_DECK_CARD_BYTES: usize = 16;

                for (id, room) in guard.iter_mut() {
                    let removed = room.prune_chat_history(chrono::Duration::hours(48));
                    if removed > 0 {
                        info!("Pruned {} old chat messages from room {}", removed, id);
                    }

                    let est = BASE_PER_ROOM
                        + room.users.len().saturating_mul(PER_USER_BYTES)
                        + room.deck.cards.len().saturating_mul(PER_DECK_CARD_BYTES);

                    total_estimated_bytes = total_estimated_bytes.saturating_add(est);

                    scan_infos.push(RoomScanInfo {
                        id: *id,
                        name: room.name.clone(),
                        last_active: room.last_active,
                        estimated_bytes: est,
                    });

                    if room.is_safe_to_remove() && room.is_inactive(room_ttl) {
                        stale_ids.push(*id);
                    }
                }

                metrics
                    .rooms_total_bytes_estimate
                    .set(total_estimated_bytes as i64);
                metrics.rooms_avg_bytes_estimate.set(if total_seen > 0 {
                    (total_estimated_bytes / total_seen) as i64
                } else {
                    0
                });
            }

            if !scan_infos.is_empty() {
                let now = chrono::Utc::now();
                let ttl = chrono::Duration::from_std(room_ttl)
                    .unwrap_or_else(|_| chrono::Duration::zero());

                info!("Room cleanup scan report ({} rooms):", scan_infos.len());

                for info in &scan_infos {
                    // --- inactive_for (days + hours) ---
                    let inactive_for = now.signed_duration_since(info.last_active);
                    let inactive_hours_total = inactive_for.num_hours().max(0);
                    let inactive_days = inactive_hours_total / 24;
                    let inactive_hours = inactive_hours_total % 24;

                    // --- removed_in (days + hours) ---
                    let removed_in = (info.last_active + ttl) - now;
                    let removed_str = if removed_in <= chrono::Duration::zero() {
                        "NOW".to_string()
                    } else {
                        let hours_total = removed_in.num_hours();
                        let days = hours_total / 24;
                        let hours = hours_total % 24;
                        format!("{}d {}h", days, hours)
                    };

                    info!(
                        "  • {:<36} | name={:<20} | inactive_for={}d {}h | size={:>6.1} KB | removed_in={}",
                        info.id,
                        info.name.as_deref().unwrap_or("<unnamed>"),
                        inactive_days,
                        inactive_hours,
                        info.estimated_bytes as f64 / 1024.0,
                        removed_str,
                    );
                }
            }

            if stale_ids.is_empty() {
                info!(
                    "Room cleanup: no inactive rooms to clean up this tick ({} rooms total).",
                    total_seen
                );
                continue;
            }

            let mut rooms_removed = 0usize;
            let mut users_removed = 0usize;

            for id in stale_ids {
                if let Some(expired_room) = {
                    let mut guard = storage.lock().await;
                    guard.remove(&id)
                } {
                    let user_count = expired_room.users.len();
                    users_removed += user_count;
                    rooms_removed += 1;

                    info!(
                        "Room cleanup: removing stale room {} (name: {:?}, users: {})",
                        id, expired_room.name, user_count
                    );

                    let event = RoomEvent {
                        room_id: id,
                        event_type: "ROOM_EXPIRED".to_string(),
                        target_user_id: None,
                        room: expired_room.get_room(),
                    };

                    crate::simple_broker::SimpleBroker::publish(event);
                    metrics.rooms_evicted.inc();
                } else {
                    warn!(
                        "Room cleanup: attempted to remove stale room {}, but it was not found (race?)",
                        id
                    );
                }
            }

            info!(
                "Room cleanup complete: removed {} room(s), freeing {} user slot(s).",
                rooms_removed, users_removed
            );
        }
    });
}

fn spawn_heartbeat_task(storage: Storage, interval: StdDuration, metrics: HeartbeatMetrics) {
    tokio::spawn(async move {
        let pid = Pid::from(std::process::id() as usize);
        let mut system = System::new_all();
        let mut ticker = tokio::time::interval(interval);

        info!("Heartbeat task started (interval = {:?})", interval);

        loop {
            ticker.tick().await;

            // Snapshot under lock
            let (room_count, total_users, total_deck_cards, total_chat_messages, total_chat_bytes) = {
                let guard = storage.lock().await;
                let mut total_users = 0usize;
                let mut total_deck_cards = 0usize;
                let mut total_chat_messages = 0usize;
                let mut total_chat_bytes = 0usize;

                for (_id, room) in guard.iter() {
                    total_users += room.users.len();
                    total_deck_cards += room.deck.cards.len();
                    total_chat_messages += room.chat_history.len();

                    for msg in &room.chat_history {
                        let formatted_len =
                            msg.formatted_content.as_ref().map(|s| s.len()).unwrap_or(0);

                        let content_len = msg.content.len();
                        total_chat_bytes =
                            total_chat_bytes.saturating_add(formatted_len.max(content_len));
                    }
                }

                (
                    guard.len(),
                    total_users,
                    total_deck_cards,
                    total_chat_messages,
                    total_chat_bytes,
                )
            };

            // ---- Derived stats ----
            let avg_users_per_room = if room_count > 0 {
                total_users as f64 / room_count as f64
            } else {
                0.0
            };

            let avg_chat_per_room = if room_count > 0 {
                total_chat_messages as f64 / room_count as f64
            } else {
                0.0
            };

            let avg_chat_memory_per_room = if room_count > 0 {
                total_chat_bytes as f64 / room_count as f64
            } else {
                0.0
            };

            // ---- Memory estimation ----
            const BASE_PER_ROOM: usize = 200;
            const PER_USER_BYTES: usize = 180;
            const PER_DECK_CARD_BYTES: usize = 16;

            let total_estimated_room_bytes = BASE_PER_ROOM.saturating_mul(room_count)
                + total_users.saturating_mul(PER_USER_BYTES)
                + total_deck_cards.saturating_mul(PER_DECK_CARD_BYTES)
                + total_chat_bytes;

            let avg_room_bytes = if room_count > 0 {
                (total_estimated_room_bytes as f64 / room_count as f64).round() as i64
            } else {
                0
            };

            // ---- Update gauges ----
            metrics.total_users.set(total_users as i64);
            metrics
                .avg_users_per_room
                .set(avg_users_per_room.round() as i64);
            metrics.total_chat_messages.set(total_chat_messages as i64);
            metrics
                .avg_chat_messages_per_room
                .set(avg_chat_per_room.round() as i64);
            metrics.total_chat_memory_bytes.set(total_chat_bytes as i64);
            metrics
                .avg_chat_memory_per_room
                .set(avg_chat_memory_per_room.round() as i64);
            metrics
                .total_room_bytes
                .set(total_estimated_room_bytes as i64);
            metrics.avg_room_bytes.set(avg_room_bytes);

            // ---- System metrics ----
            system.refresh_all();
            let (mem_mib, cpu_pct_x100) = if let Some(proc) = system.process(pid) {
                let mem_mib = (proc.memory() / 1024 / 1024) as i64;
                let cpu_pct_x100 = (proc.cpu_usage() * 100.0) as i64;
                (mem_mib, cpu_pct_x100)
            } else {
                (0, 0)
            };

            metrics.process_memory_mib.set(mem_mib);
            metrics.process_cpu_percent_x100.set(cpu_pct_x100);

            info!(
                "[heartbeat] \
                CPU: {:.2}% | MEM: {} MiB | \
                Rooms: {} | Users: {} ({:.1}/room) | \
                Chat: {} msgs | Avg Room Size: {:.1} KB",
                cpu_pct_x100 as f64 / 100.0,
                mem_mib,
                room_count,
                total_users,
                avg_users_per_room,
                total_chat_messages,
                avg_room_bytes as f64 / 1024.0,
            );
        }
    });
}

#[tokio::main]
async fn main() -> std::io::Result<()> {
    println!("Hello, world! This is the server for Summit Planning Poker");

    let env = Env::default().filter_or("RUST_LOG", "info,actix_web=trace");
    env_logger::init_from_env(env);

    let settings = get_configuration().expect("Failed to read settings.");
    let configured_addr = settings.get_server_address();

    let port = env::var("PORT").unwrap_or_else(|_| {
        configured_addr
            .split(':')
            .next_back()
            .unwrap_or("8000")
            .to_string()
    });

    let server_bind_addr = format!("0.0.0.0:{}", port);

    println!("Playground (local): http://127.0.0.1:{}", port);
    println!("Server will bind to: {}", server_bind_addr);

    let storage: Storage = Arc::new(Mutex::new(HashMap::new()));

    // ----- Prometheus setup -----
    let registry = Registry::new();

    let rooms_evicted =
        IntCounter::new("rooms_evicted_total", "Total rooms evicted by cleanup").unwrap();
    let rooms_scanned =
        IntCounter::new("rooms_scanned_total", "Total rooms scanned by cleanup").unwrap();
    let rooms_current =
        IntGauge::new("rooms_current", "Current number of rooms in memory").unwrap();
    let rooms_total_bytes_estimate = IntGauge::new(
        "rooms_total_bytes_estimate",
        "Estimated total bytes for all rooms (metadata-only estimator)",
    )
    .unwrap();
    let rooms_avg_bytes_estimate = IntGauge::new(
        "rooms_avg_bytes_estimate",
        "Estimated average bytes per room (metadata-only estimator)",
    )
    .unwrap();

    // Heartbeat-related gauges
    let total_users = IntGauge::new("rooms_total_users", "Total users across all rooms").unwrap();
    let avg_users_per_room =
        IntGauge::new("rooms_avg_users_per_room", "Average users per room").unwrap();
    let process_memory_mib = IntGauge::new("process_memory_mib", "Process memory (MiB)").unwrap();
    let process_cpu_percent_x100 =
        IntGauge::new("process_cpu_percent_x100", "Process CPU percent * 100").unwrap();
    let total_chat_messages = IntGauge::new(
        "total_chat_messages",
        "Total number of chat messages across all rooms",
    )
    .unwrap();

    let avg_chat_messages_per_room = IntGauge::new(
        "avg_chat_messages_per_room",
        "Average number of chat messages per room",
    )
    .unwrap();
    let total_chat_memory_bytes = IntGauge::new(
        "total_chat_memory_bytes",
        "Estimated memory bytes consumed by all chat messages (compressed)",
    )
    .unwrap();

    let avg_chat_memory_per_room = IntGauge::new(
        "avg_chat_memory_per_room",
        "Average estimated memory bytes consumed by chat messages per room",
    )
    .unwrap();
    let total_room_bytes_gauge = IntGauge::new(
        "rooms_estimated_total_bytes",
        "Estimated total bytes for all rooms",
    )
    .unwrap();
    let avg_room_bytes_gauge = IntGauge::new(
        "rooms_estimated_avg_bytes",
        "Estimated average bytes per room",
    )
    .unwrap();

    registry
        .register(Box::new(rooms_total_bytes_estimate.clone()))
        .ok();
    registry
        .register(Box::new(rooms_avg_bytes_estimate.clone()))
        .ok();
    registry.register(Box::new(rooms_evicted.clone())).ok();
    registry.register(Box::new(rooms_scanned.clone())).ok();
    registry.register(Box::new(rooms_current.clone())).ok();
    registry.register(Box::new(total_users.clone())).ok();
    registry.register(Box::new(avg_users_per_room.clone())).ok();
    registry.register(Box::new(process_memory_mib.clone())).ok();
    registry
        .register(Box::new(process_cpu_percent_x100.clone()))
        .ok();
    registry
        .register(Box::new(total_chat_messages.clone()))
        .ok();
    registry
        .register(Box::new(avg_chat_messages_per_room.clone()))
        .ok();
    registry
        .register(Box::new(total_chat_memory_bytes.clone()))
        .ok();
    registry
        .register(Box::new(avg_chat_memory_per_room.clone()))
        .ok();
    registry
        .register(Box::new(total_room_bytes_gauge.clone()))
        .ok();
    registry
        .register(Box::new(avg_room_bytes_gauge.clone()))
        .ok();

    let registry = Arc::new(registry);

    let cleanup_metrics = CleanupMetrics {
        rooms_evicted,
        rooms_scanned,
        rooms_current,
        rooms_total_bytes_estimate,
        rooms_avg_bytes_estimate,
    };

    let heartbeat_metrics = HeartbeatMetrics {
        total_users,
        avg_users_per_room,
        process_memory_mib,
        process_cpu_percent_x100,
        total_chat_messages,
        avg_chat_messages_per_room,
        total_chat_memory_bytes,
        avg_chat_memory_per_room,
        total_room_bytes: total_room_bytes_gauge,
        avg_room_bytes: avg_room_bytes_gauge,
    };

    // Spawn the cleanup task: every 30 minutes, remove rooms inactive > 8 days
    spawn_room_cleanup_task(
        storage.clone(),
        StdDuration::from_secs(60 * 30),
        StdDuration::from_secs(8 * 24 * 60 * 60),
        cleanup_metrics,
    );

    // Spawn heartbeat task
    let hb_interval_secs: u64 = env::var("HEARTBEAT_INTERVAL_SECS")
        .ok()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(60);

    spawn_heartbeat_task(
        storage.clone(),
        StdDuration::from_secs(hb_interval_secs),
        heartbeat_metrics,
    );

    let schema = Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)
        .data(storage.clone())
        .finish();

    let http_client = reqwest::Client::builder()
        .user_agent("SummitPlanningPoker/1.0")
        .build()
        .expect("Failed to build HTTP client");

    HttpServer::new(move || {
        let registry = registry.clone();

        App::new()
            .app_data(Data::new(schema.clone()))
            .app_data(Data::new(storage.clone()))
            .app_data(Data::new(http_client.clone()))
            .wrap(Cors::permissive())
            .wrap(
                middleware::Logger::new(
                    "[http] kind=%{KIND}xi method=%m path=%U status=%s outcome=%{OUTCOME}xo duration_ms=%D bytes=%b peer=%a origin=\"%{Origin}i\"",
                )
                .custom_request_replace("KIND", |request| {
                    let path = request.path();
                    let method = request.method().as_str();
                    let websocket = request
                        .headers()
                        .get("upgrade")
                        .and_then(|value| value.to_str().ok())
                        .is_some_and(|value| value.eq_ignore_ascii_case("websocket"));

                    http_request_kind(method, path, websocket).to_string()
                })
                .custom_response_replace("OUTCOME", |response| {
                    http_outcome(response.status().as_u16()).to_string()
                }),
            )
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
            .service(web::resource("/giphy/image").route(web::get().to(giphy::image)))
            .service(web::resource("/giphy/{path:.*}").route(web::get().to(giphy::api)))
    })
    .bind(server_bind_addr)?
    .run()
    .await
}

#[cfg(test)]
mod http_log_tests {
    use super::{http_outcome, http_request_kind};

    #[test]
    fn classifies_the_previously_opaque_http_requests() {
        assert_eq!(http_request_kind("GET", "/", true), "graphql_websocket");
        assert_eq!(http_request_kind("OPTIONS", "/", false), "cors_preflight");
        assert_eq!(http_request_kind("POST", "/", false), "graphql_http");
        assert_eq!(http_outcome(101), "upgraded");
        assert_eq!(http_outcome(200), "success");
        assert_eq!(http_outcome(503), "server_error");
    }
}
