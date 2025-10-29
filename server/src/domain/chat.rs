use async_graphql::{SimpleObject, InputObject};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Clone, Debug, SimpleObject)]
pub struct ChatPosition {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Clone, Debug, InputObject)]
pub struct ChatPositionInput {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// A chat message within a room.
#[derive(Clone, Debug, SimpleObject)]
pub struct ChatMessage {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub username: String,

    /// The plain-text version of the message (for search and fallback rendering)
    pub content: String,

    /// Optional formatted (HTML or Markdown) version of the message
    pub formatted_content: Option<String>,

    /// Message type: "text", "html", "gif", "image", etc.
    pub content_type: String,

    pub position: Option<ChatPosition>,
    pub timestamp: DateTime<Utc>,
}

impl ChatMessage {
    pub fn new(
        room_id: Uuid,
        user_id: Uuid,
        username: String,
        content: String,
        formatted_content: Option<String>,
        content_type: String,
        position: Option<ChatPosition>,
    ) -> Self {
        ChatMessage {
            id: Uuid::new_v4(),
            room_id,
            user_id,
            username,
            content,
            formatted_content,
            content_type,
            position,
            timestamp: Utc::now(),
        }
    }
}
