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
    pub countdown_enabled: bool,
    pub reveal_stage: Option<String>,
    pub countdown_value: Option<i32>,
    pub confirm_new_game: bool,
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
            countdown_enabled: false,
            reveal_stage: Some("idle".to_string()),
            countdown_value: None,
            confirm_new_game: true,
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
                }
                user
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

    pub fn rename(&mut self, new_name: Option<String>) {
        self.name = new_name;
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

    // === Countdown management ===
    pub fn enable_countdown(&mut self, enabled: bool) {
        self.countdown_enabled = enabled;
    }

    pub fn start_countdown(&mut self) {
        if self.countdown_enabled {
            self.reveal_stage = Some("countdown".to_string());
            self.countdown_value = Some(3);
        }
    }

    pub fn update_countdown_value(&mut self, value: i32) {
        self.countdown_value = Some(value);
    }

    pub fn complete_countdown(&mut self) {
        self.reveal_stage = Some("revealed".to_string());
        self.countdown_value = None;
        self.is_game_over = true;
    }

    pub fn cancel_countdown(&mut self) {
        self.reveal_stage = Some("cancelled".to_string());
        self.countdown_value = None;
    }

    pub fn toggle_confirm_new_game(&mut self, enabled: bool) {
        self.confirm_new_game = enabled;
    }
}
