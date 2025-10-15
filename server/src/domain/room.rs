use async_graphql::SimpleObject;
use uuid::Uuid;

use crate::types::{Card, EntityId};

use super::{
    deck::Deck,
    game::{Game, UserCard},
    user::User,
};

#[derive(Clone, Debug, SimpleObject)]
pub struct Room {
    pub id: EntityId,
    pub name: Option<String>,
    pub users: Vec<User>,
    pub banned_users: Vec<EntityId>,
    pub deck: Deck,
    pub game: Game,
    pub is_game_over: bool,
    pub room_owner_id: Option<EntityId>,
}

impl Room {
    pub fn new(name: Option<String>, cards: Vec<Card>) -> Self {
        Room {
            id: Uuid::new_v4(),
            name,
            users: vec![],
            banned_users: vec![],
            deck: Deck::new_with_cards(cards),
            game: Game::new(),
            is_game_over: false,
            room_owner_id: None,
        }
    }

    pub fn get_room(&self) -> Room {
        if self.is_game_over {
            self.clone()
        } else {
            let table: Vec<UserCard> = self
                .clone()
                .game
                .table
                .iter()
                .map(|user_card| UserCard {
                    user_id: user_card.user_id,
                    card: None,
                })
                .collect();

            Room {
                game: Game {
                    table,
                    ..self.game.clone()
                },
                ..self.clone()
            }
        }
    }

    pub fn is_user_exist(&self, user_id: EntityId) -> bool {
        self.users.iter().any(|user| user.id == user_id)
    }

    pub fn edit_user(&mut self, user_id: EntityId, username: String) {
        let users: Vec<User> = self
            .users
            .clone()
            .into_iter()
            .map(|mut user| {
                if user.id == user_id {
                    user.username = username.clone();

                    user
                } else {
                    user
                }
            })
            .collect();

        self.users = users;
    }

    pub fn remove_user(&mut self, user_id: EntityId) {
        let users: Vec<User> = self
            .users
            .clone()
            .into_iter()
            .filter(|user| user.id != user_id)
            .collect();

        let table: Vec<UserCard> = self
            .game
            .table
            .clone()
            .into_iter()
            .filter(|user_card| user_card.user_id != user_id)
            .collect();

        self.users = users;
        self.game.table = table;
    }

    pub fn set_room_owner(&mut self, user_id: Option<EntityId>) -> Result<(), String> {
        match user_id {
            Some(uid) => {
                if !self.is_user_exist(uid) {
                    return Err(format!("User with ID {} does not exist in the room", uid));
                }
                self.room_owner_id = Some(uid);
            }
            None => {
                self.room_owner_id = None;
            }
        }

        Ok(())
    }

    pub fn is_banned(&self, user_id: EntityId) -> bool {
        self.banned_users.contains(&user_id)
    }

    pub fn kick_user(&mut self, user_id: EntityId) {
        self.remove_user(user_id);
    }

    pub fn ban_user(&mut self, user_id: EntityId) {
        self.remove_user(user_id);

        if !self.is_banned(user_id) {
            self.banned_users.push(user_id);
        }
    }

    pub fn unban_user(&mut self, user_id: EntityId) {
        self.banned_users.retain(|id| *id != user_id);
    }
}
