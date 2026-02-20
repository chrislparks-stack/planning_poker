use std::collections::HashMap;
use tokio::time::{sleep, Duration};

use crate::{
    domain::{
        game::{Game, UserCard},
        room::Room,
        user::{User, UserInput},
        chat::{ChatMessage, ChatPosition, ChatPositionInput}
    },
    simple_broker::SimpleBroker,
    types::{Card, EntityId, Storage},
};
use async_graphql::*;
use futures_util::{Stream, StreamExt};
use tokio::sync::MutexGuard;
use uuid::Uuid;

#[derive(Clone, Debug, SimpleObject)]
pub struct RoomEvent {
    pub room_id: Uuid,
    pub event_type: String,
    pub target_user_id: Option<Uuid>,
    pub room: Room,
}

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
    pub cards: Vec<String>
}

#[derive(InputObject)]
pub struct SendChatInput {
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub content: String,
    pub formatted_content: Option<String>,
    pub content_type: String,
    pub position: Option<ChatPositionInput>
}

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn create_room(
        &self,
        ctx: &Context<'_>,
        room_id: Option<Uuid>,
        name: Option<String>,
        cards: Vec<Card>,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;
        let mut room = Room::new_with_id(room_id, name, cards);

        room.touch();

        // Store and publish
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
        room_owner_id: Option<EntityId>,
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

                    room.users.push(user.clone().into());

                    if let Some(owner_id) = room_owner_id {
                        let _ = room.set_room_owner(Some(owner_id));
                    }

                    room.touch();

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

                room.touch();

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

                room.touch();

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

                room.touch();

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
            room.touch();

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
                room.touch();
                SimpleBroker::publish(room.get_room());
            }
            drop(storage);
        }

        let mut storage = get_storage(ctx).await;
        match storage.get_mut(&room_id) {
            Some(room) => {
                if room.reveal_stage.as_deref() != Some("cancelled") {
                    room.complete_countdown();
                    room.touch();
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

                room.touch();

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
                room.touch();

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

                    room.touch();

                    SimpleBroker::publish(room.get_room());
                }
                (key, room)
            })
            .collect();

        let (last_card_picked, last_card_value, last_seen_chat_message_id) = storage
            .values()
            .find_map(|room| {
                room.users
                    .iter()
                    .find(|u| u.id == user_id)
                    .map(|u| (
                        u.last_card_picked.clone(),
                        u.last_card_value,
                        u.last_seen_chat_message_id
                    ))
            })
            .unwrap_or((None, None, None));

        Ok(User {
            id: user_id,
            username,
            last_card_picked,
            last_card_value,
            last_seen_chat_message_id
        })
    }

    async fn logout(&self, ctx: &Context<'_>, user_id: Option<EntityId>) -> Result<bool> {
        if let Some(uid) = user_id {
            let mut storage = get_storage(ctx).await;

            *storage = storage
                .clone()
                .into_iter()
                .map(|(key, mut room)| {
                    if room.is_user_exist(uid) {
                        room.remove_user(uid);
                        room.touch();
                        SimpleBroker::publish(room.get_room());
                    }
                    (key, room)
                })
                .collect();
        }

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
                room.game.table.retain(|u| u.user_id != user_id);

                if let Some(user) = room.users.iter_mut().find(|u| u.id == user_id) {
                    if card.trim().is_empty() {
                        user.last_card_picked = None;
                        user.last_card_value = None;
                    } else {
                        user.last_card_picked = Some(card.clone());
                        user.last_card_value = crate::domain::user::parse_card_to_number(&card);
                    }
                }

                if !card.trim().is_empty() {
                    room.game.table.push(UserCard::new(user_id, card));
                }

                room.touch();

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

                room.touch();

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

                for u in room.users.iter_mut() {
                    u.last_card_picked = None;
                    u.last_card_value = None;
                }

                room.touch();

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

                room.touch();

                SimpleBroker::publish(room.get_room());

                let event = RoomEvent {
                    room_id,
                    event_type: "USER_KICKED".to_string(),
                    target_user_id: Some(target_user_id),
                    room: room.get_room(),
                };

                SimpleBroker::publish(event);

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

                    room.touch();

                    SimpleBroker::publish(room.get_room());

                    let event = RoomEvent {
                        room_id,
                        event_type: "USER_BANNED".to_string(),
                        target_user_id: Some(target_user_id),
                        room: room.get_room(),
                    };

                    SimpleBroker::publish(event);

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

                room.touch();

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

                room.touch();

                SimpleBroker::publish(room.get_room());
                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

     async fn send_chat_message(
        &self,
        ctx: &Context<'_>,
        input: SendChatInput,
     ) -> Result<ChatMessage> {
        let mut storage = get_storage(ctx).await;
        let room = storage
            .get_mut(&input.room_id)
            .ok_or(Error::new("Room not found"))?;

        let msg = ChatMessage::new(
            input.room_id,
            input.user_id,
            input.username.clone(),
            input.content.clone(),
            input.formatted_content.clone(),
            input.content_type.clone(),
            input.position.clone().map(|p| ChatPosition {
                x: p.x,
                y: p.y,
                width: p.width,
                height: p.height,
            }),
        );

        room.push_chat(msg.clone());

        room.touch();
        SimpleBroker::publish(msg.clone());
        SimpleBroker::publish(room.get_room());

        Ok(msg)
    }

    async fn mark_chat_seen(
        &self,
        ctx: &Context<'_>,
        room_id: Uuid,
        user_id: Uuid,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.mark_chat_seen(user_id);
                room.touch();

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

    async fn room_events(&self, room_id: EntityId) -> impl Stream<Item = RoomEvent> {
        SimpleBroker::<RoomEvent>::subscribe().filter(move |event| {
            let is_current_room = room_id == event.room_id;
            async move { is_current_room }
        })
    }

    async fn room_chat(&self, room_id: Uuid) -> impl Stream<Item = ChatMessage> {
        SimpleBroker::<ChatMessage>::subscribe()
            .filter(move |msg| {
                let same_room = msg.room_id == room_id;
                async move { same_room }
            })
    }
}
