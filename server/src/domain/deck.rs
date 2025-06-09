use async_graphql::SimpleObject;
use uuid::Uuid;

use crate::types::{Card, EntityId};

#[derive(Clone, Debug, SimpleObject)]
pub struct Deck {
    pub id: EntityId,
    pub cards: Vec<Card>,
}

impl Deck {
    pub fn new_with_cards(cards: Vec<Card>) -> Self {
        Deck {
            id: Uuid::new_v4(),
            cards,
        }
    }
}
