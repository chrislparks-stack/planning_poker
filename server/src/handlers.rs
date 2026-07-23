use std::time::Instant;

use actix_web::{HttpRequest, HttpResponse, Result, web};
use async_graphql::{
    Request, Schema, Value, Variables,
    http::{GraphQLPlaygroundConfig, playground_source},
};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};
use log::{info, warn};
use uuid::Uuid;

use crate::{schema::PokerPlanningSchema, types::Storage};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct StateSnapshot {
    rooms: usize,
    users: usize,
    chat_messages: usize,
}

impl StateSnapshot {
    async fn capture(storage: &Storage) -> Self {
        let rooms = storage.lock().await;
        Self {
            rooms: rooms.len(),
            users: rooms.values().map(|room| room.users.len()).sum(),
            chat_messages: rooms.values().map(|room| room.chat_history.len()).sum(),
        }
    }

    fn change_summary(self, after: Self) -> String {
        format!(
            "rooms={}->{} ({:+}), users={}->{} ({:+}), chat_messages={}->{} ({:+})",
            self.rooms,
            after.rooms,
            after.rooms as isize - self.rooms as isize,
            self.users,
            after.users,
            after.users as isize - self.users as isize,
            self.chat_messages,
            after.chat_messages,
            after.chat_messages as isize - self.chat_messages as isize,
        )
    }
}

fn operation_kind(request: &Request) -> &'static str {
    request
        .query
        .lines()
        .map(str::trim_start)
        .find_map(|line| {
            if line.starts_with("mutation ") {
                Some("mutation")
            } else if line.starts_with("subscription ") {
                Some("subscription")
            } else if line.starts_with("query ") {
                Some("query")
            } else {
                None
            }
        })
        .unwrap_or("query")
}

fn operation_action(name: &str) -> &'static str {
    match name {
        "CreateRoom" => "create an empty room",
        "CreateUser" => "create a user identity",
        "JoinRoom" => "add a user to a room",
        "UpdateDeck" => "replace a room's card deck",
        "RenameRoom" => "rename a room",
        "ToggleCountdownOption" => "change the countdown setting",
        "StartRevealCountdown" => "start the reveal countdown",
        "CancelRevealCountdown" => "cancel the reveal countdown",
        "SetRoomOwner" => "change the room owner",
        "EditUser" => "edit a user",
        "Logout" => "remove a user from rooms",
        "PickCard" => "record a vote",
        "ShowCards" => "reveal votes",
        "ResetGame" => "reset the game",
        "KickUser" => "kick a user",
        "BanUser" => "ban a user",
        "UnbanUser" => "unban a user",
        "ToggleConfirmNewGame" => "change new-game confirmation",
        "ToggleShowVoteChanges" => "change vote-change visibility",
        "SendChatMessage" => "add a chat message",
        "MarkChatSeen" => "mark chat as seen",
        "GetRoom" => "read the current room",
        "GetRoomUnread" => "read room and unread-chat state",
        _ => "execute GraphQL operation",
    }
}

fn scalar_text(value: &Value) -> Option<String> {
    match value {
        Value::String(value) => Some(value.clone()),
        Value::Enum(value) => Some(value.to_string()),
        Value::Boolean(value) => Some(value.to_string()),
        Value::Number(value) => Some(value.to_string()),
        _ => None,
    }
}

fn nested_value<'a>(variables: &'a Variables, object: &str, field: &str) -> Option<&'a Value> {
    match variables.get(object) {
        Some(Value::Object(values)) => values.get(field),
        _ => None,
    }
}

fn safe_request_context(variables: &Variables) -> String {
    let room_id = variables
        .get("roomId")
        .or_else(|| nested_value(variables, "input", "roomId"));
    let user_id = variables
        .get("userId")
        .or_else(|| nested_value(variables, "user", "id"))
        .or_else(|| nested_value(variables, "input", "userId"));
    let cards = variables
        .get("cards")
        .or_else(|| nested_value(variables, "input", "cards"));

    let mut fields = Vec::new();
    for (label, value) in [
        ("room_id", room_id),
        ("user_id", user_id),
        ("target_user_id", variables.get("targetUserId")),
        ("room_owner_id", variables.get("roomOwnerId")),
        ("enabled", variables.get("enabled")),
    ] {
        if let Some(value) = value.and_then(scalar_text) {
            fields.push(format!("{label}={value}"));
        }
    }

    if let Some(Value::List(cards)) = cards {
        fields.push(format!("cards_count={}", cards.len()));
    }

    if fields.is_empty() {
        "context=none".to_string()
    } else {
        fields.join(" ")
    }
}

fn clean_error(message: &str) -> String {
    let single_line = message.replace(['\r', '\n'], " ");
    single_line.chars().take(240).collect()
}

pub async fn health_check() -> HttpResponse {
    HttpResponse::Ok().finish()
}

pub async fn index(
    schema: web::Data<PokerPlanningSchema>,
    storage: web::Data<Storage>,
    request: GraphQLRequest,
) -> GraphQLResponse {
    let request = request.into_inner();
    let request_id = Uuid::new_v4();
    let operation = request
        .operation_name
        .clone()
        .unwrap_or_else(|| "anonymous".to_string());
    let kind = operation_kind(&request);
    let action = operation_action(&operation);
    let context = safe_request_context(&request.variables);
    let state_before = if kind == "mutation" {
        Some(StateSnapshot::capture(storage.get_ref()).await)
    } else {
        None
    };
    let started = Instant::now();

    info!(
        "[graphql] request_started request_id={} type={} operation={} action=\"{}\" {}",
        request_id, kind, operation, action, context
    );

    let response = schema.execute(request).await;
    let duration_ms = started.elapsed().as_secs_f64() * 1000.0;
    let state_change = match state_before {
        Some(before) => {
            let after = StateSnapshot::capture(storage.get_ref()).await;
            format!(" state=\"{}\"", before.change_summary(after))
        }
        None => String::new(),
    };

    if response.is_ok() {
        info!(
            "[graphql] request_finished request_id={} type={} operation={} status=success errors=0 duration_ms={:.2}{}",
            request_id, kind, operation, duration_ms, state_change
        );
    } else {
        let errors = response
            .errors
            .iter()
            .map(|error| clean_error(&error.message))
            .collect::<Vec<_>>()
            .join(" | ");
        warn!(
            "[graphql] request_finished request_id={} type={} operation={} status=failed errors={} duration_ms={:.2} error=\"{}\"{}",
            request_id,
            kind,
            operation,
            response.errors.len(),
            duration_ms,
            errors,
            state_change
        );
    }

    response.into()
}

pub async fn index_playground() -> Result<HttpResponse> {
    let source = playground_source(GraphQLPlaygroundConfig::new("/").subscription_endpoint("/"));
    Ok(HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(source))
}

pub async fn index_ws(
    schema: web::Data<PokerPlanningSchema>,
    request: HttpRequest,
    payload: web::Payload,
) -> Result<HttpResponse> {
    let peer = request
        .connection_info()
        .realip_remote_addr()
        .unwrap_or("unknown")
        .to_string();
    let origin = request
        .headers()
        .get("origin")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("none");
    info!(
        "[websocket] upgrade_requested endpoint=/ peer={} origin={} protocol=graphql-transport-ws",
        peer, origin
    );
    GraphQLSubscription::new(Schema::clone(&*schema)).start(&request, payload)
}

#[cfg(test)]
mod tests {
    use async_graphql::{Request, Variables};
    use serde_json::json;

    use super::{StateSnapshot, operation_action, operation_kind, safe_request_context};

    #[test]
    fn identifies_named_mutations_and_safe_context() {
        let request = Request::new(
            "mutation JoinRoom($roomId: UUID!, $user: UserInput!) { joinRoom(roomId: $roomId, user: $user) { id } }",
        )
        .operation_name("JoinRoom")
        .variables(Variables::from_json(json!({
            "roomId": "room-123",
            "user": { "id": "user-456", "username": "must-not-be-logged" }
        })));

        assert_eq!(operation_kind(&request), "mutation");
        assert_eq!(operation_action("JoinRoom"), "add a user to a room");
        assert_eq!(
            safe_request_context(&request.variables),
            "room_id=room-123 user_id=user-456"
        );
    }

    #[test]
    fn state_summary_shows_absolute_totals_and_deltas() {
        let before = StateSnapshot {
            rooms: 5,
            users: 18,
            chat_messages: 1,
        };
        let after = StateSnapshot {
            rooms: 6,
            users: 18,
            chat_messages: 1,
        };

        assert_eq!(
            before.change_summary(after),
            "rooms=5->6 (+1), users=18->18 (+0), chat_messages=1->1 (+0)"
        );
    }
}
