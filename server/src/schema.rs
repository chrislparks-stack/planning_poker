use std::collections::HashMap;
use tokio::time::{sleep, Duration};

use crate::{
    domain::{
        game::{Game, UserCard},
        room::Room,
        user::{User, UserInput},
    },
    simple_broker::SimpleBroker,
    types::{Card, EntityId, Storage},
};
use async_graphql::*;
use futures_util::{lock::MutexGuard, Stream, StreamExt};
use uuid::Uuid;

async fn get_storage<'a>(ctx: &'a Context<'_>) -> MutexGuard<'a, HashMap<Uuid, Room>> {
    ctx.data_unchecked::<Storage>().lock().await
}

pub type PokerPlanningSchema = Schema<QueryRoot, MutationRoot, SubscriptionRoot>;

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    async fn rooms(&self, ctx: &Context<'_>) -> Result<Vec<Room>> {
        let storage = get_storage(ctx).await;

        Ok(storage.clone().into_values().collect())
    }

    async fn user_rooms(&self, ctx: &Context<'_>, user_id: EntityId) -> Result<Vec<Room>> {
        let storage = get_storage(ctx).await;

        let rooms = storage
            .clone()
            .into_iter()
            .fold(vec![], |mut acc, (_, room)| {
                if room
                    .users
                    .iter()
                    .any(|user_in_room| user_in_room.id == user_id)
                {
                    acc.push(room);
                }

                acc
            });

        Ok(rooms)
    }

    async fn room_by_id(&self, ctx: &Context<'_>, room_id: Uuid) -> Result<Option<Room>> {
        let storage = get_storage(ctx).await;
        Ok(storage.get(&room_id).cloned())
    }
}

#[derive(InputObject)]
pub struct UpdateDeckInput {
    pub room_id: Uuid,
    pub cards: Vec<String>,
}

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn create_room(&self, ctx: &Context<'_>, name: Option<String>, cards: Vec<Card>) -> Result<Room> {
        let mut storage = get_storage(ctx).await;
        let room = Room::new(name, cards);

        storage.insert(room.id, room.clone());

        SimpleBroker::publish(room.get_room());

        Ok(room.get_room())
    }

    async fn create_user(&self, username: String) -> User {
        User::new(username)
    }

    async fn join_room(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        user: UserInput,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                if room.is_banned(user.id) {
                    return Err(Error::new("User is banned from this room"));
                }

                let is_new_user = !room.users.iter().any(|u| u.id == user.id);

                if is_new_user {
                    if let Some(name) = &user.room_name {
                        room.name = Some(name.clone());
                }

                    room.users.push(user.into());
                    SimpleBroker::publish(room.get_room());
                }

                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn update_deck(&self, ctx: &Context<'_>, input: UpdateDeckInput) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&input.room_id) {
            Some(room) => {
                room.deck.cards = input.cards.clone();

                SimpleBroker::publish(room.get_room());

                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn rename_room(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        name: Option<String>,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.rename(name);
                SimpleBroker::publish(room.get_room());
                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn toggle_countdown_option(
        &self,
        ctx: &Context<'_>,
        room_id: Uuid,
        enabled: bool
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.enable_countdown(enabled);
                SimpleBroker::publish(room.get_room());
                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn start_reveal_countdown(
        &self,
        ctx: &Context<'_>,
        room_id: Uuid,
        user_id: Option<Uuid>, // optional so only owner can start
    ) -> Result<Room> {
        {
            let mut storage = get_storage(ctx).await;

            let room = storage.get_mut(&room_id).ok_or(Error::new("Room not found"))?;

            if let Some(uid) = user_id {
                if Some(uid) != room.room_owner_id {
                    return Err(Error::new("Only the room owner can start the countdown"));
                }
            }

            if !room.countdown_enabled {
                return Err(Error::new("Countdown reveal is disabled for this room"));
            }

            room.start_countdown();
            SimpleBroker::publish(room.get_room());
        }

        for remaining in (1..=3).rev() {
            sleep(Duration::from_secs(1)).await;

            let mut storage = get_storage(ctx).await;
            if let Some(room) = storage.get_mut(&room_id) {
                // If countdown cancelled, stop
                if room.reveal_stage.as_deref() == Some("cancelled") {
                    room.countdown_value = None;
                    SimpleBroker::publish(room.get_room());
                    return Ok(room.get_room());
                }

                room.update_countdown_value(remaining);
                SimpleBroker::publish(room.get_room());
            }
            drop(storage);
        }

        let mut storage = get_storage(ctx).await;
        match storage.get_mut(&room_id) {
            Some(room) => {
                if room.reveal_stage.as_deref() != Some("cancelled") {
                    room.complete_countdown();
                    SimpleBroker::publish(room.get_room());
                }
                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn cancel_reveal_countdown(
        &self,
        ctx: &Context<'_>,
        room_id: Uuid,
        user_id: Option<Uuid>,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                // Ownership check
                if let Some(uid) = user_id {
                    if Some(uid) != room.room_owner_id {
                        return Err(Error::new("Only the room owner can cancel the countdown"));
                    }
                }

                room.cancel_countdown();
                SimpleBroker::publish(room.get_room());
                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn set_room_owner(
        &self,
        ctx: &Context<'_>,
        room_id: Uuid,
        user_id: Option<Uuid>
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.set_room_owner(user_id)?;
                SimpleBroker::publish(room.get_room());
                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn edit_user(
        &self,
        ctx: &Context<'_>,
        user_id: EntityId,
        username: String,
    ) -> Result<User> {
        let mut storage = get_storage(ctx).await;

        *storage = storage
            .clone()
            .into_iter()
            .map(|(key, mut room)| {
                if room.is_user_exist(user_id) {
                    room.edit_user(user_id, username.clone());

                    SimpleBroker::publish(room.get_room());
                }

                (key, room)
            })
            .collect();

        Ok(User {
            id: user_id,
            username,
        })
    }

    async fn logout(&self, ctx: &Context<'_>, user_id: EntityId) -> Result<bool> {
        let mut storage = get_storage(ctx).await;

        *storage = storage
            .clone()
            .into_iter()
            .map(|(key, mut room)| {
                if room.is_user_exist(user_id) {
                    room.remove_user(user_id);

                    SimpleBroker::publish(room.get_room());
                }

                (key, room)
            })
            .collect();

        Ok(true)
    }

    async fn pick_card(
        &self,
        ctx: &Context<'_>,
        user_id: EntityId,
        room_id: EntityId,
        card: String,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                // Remove any existing card for this user
                room.game.table.retain(|u| u.user_id != user_id);

                // If the card is not empty, add the new card
                if !card.trim().is_empty() {
                    room.game.table.push(UserCard::new(user_id, card));
                }

                SimpleBroker::publish(room.get_room());
                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn show_cards(&self, ctx: &Context<'_>, room_id: EntityId) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.is_game_over = true;

                SimpleBroker::publish(room.get_room());

                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn reset_game(&self, ctx: &Context<'_>, room_id: EntityId) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.is_game_over = false;
                room.game = Game::new();

                SimpleBroker::publish(room.get_room());

                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn kick_user(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        target_user_id: EntityId,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.kick_user(target_user_id);
                SimpleBroker::publish(room.get_room());
                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn ban_user(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        target_user_id: EntityId,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.ban_user(target_user_id);
                SimpleBroker::publish(room.get_room());
                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn unban_user(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        target_user_id: EntityId,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.unban_user(target_user_id);
                SimpleBroker::publish(room.get_room());
                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn toggle_confirm_new_game(
        &self,
        ctx: &Context<'_>,
        room_id: Uuid,
        enabled: bool,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.toggle_confirm_new_game(enabled);
                SimpleBroker::publish(room.get_room());
                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }
}

pub struct SubscriptionRoot;

#[Subscription]
impl SubscriptionRoot {
    async fn room(&self, room_id: EntityId) -> impl Stream<Item = Room> {
        SimpleBroker::<Room>::subscribe().filter(move |event| {
            let is_current_room = room_id == event.id;

            async move { is_current_room }
        })
    }
}
