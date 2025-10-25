use async_graphql::{InputObject, SimpleObject};
use uuid::Uuid;

use crate::types::EntityId;

#[derive(Clone, Debug, InputObject)]
pub struct UserInput {
    pub id: EntityId,
    pub username: String,
    pub room_name: Option<String>,
    pub last_card_picked: Option<String>,
}

#[derive(Clone, Debug, SimpleObject)]
pub struct User {
    pub id: EntityId,
    pub username: String,
    pub last_card_picked: Option<String>,
    pub last_card_value: Option<f32>,
}

impl User {
    pub fn new(username: String) -> Self {
        User {
            id: Uuid::new_v4(),
            username,
            last_card_picked: None,
            last_card_value: None,
        }
    }
}

impl From<UserInput> for User {
    fn from(input: UserInput) -> Self {
        let last_card_value = input
            .last_card_picked
            .as_deref()
            .and_then(|s| crate::domain::user::parse_card_to_number(s));

        User {
            id: input.id,
            username: input.username,
            last_card_picked: input.last_card_picked,
            last_card_value,
        }
    }
}

/// Small helper to coerce common card representations into a numeric f32, or None.
pub fn parse_card_to_number(s: &str) -> Option<f32> {
    let s = s.trim();

    if s.is_empty() {
        return None;
    }

    if s == "?" || s == "☕" {
        return None;
    }

    if s == "½" || s == "1/2" {
        return Some(0.5);
    }

    if let Ok(v) = s.parse::<f32>() {
        return Some(v);
    }

    None
}
