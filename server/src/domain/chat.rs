use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// A chat message within a room.
#[derive(Clone, Debug, SimpleObject)]
pub struct ChatMessage {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub content: String,
    pub content_type: String,
    pub timestamp: DateTime<Utc>,
}

impl ChatMessage {
    pub fn new(
        room_id: Uuid,
        user_id: Uuid,
        username: String,
        content: String,
        content_type: String,
    ) -> Self {
        ChatMessage {
            id: Uuid::new_v4(),
            room_id,
            user_id,
            username,
            content,
            content_type,
            timestamp: Utc::now(),
        }
    }
}
