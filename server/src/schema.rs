use std::collections::HashMap;
use tokio::time::{Duration, sleep};

use crate::{
    domain::{
        chat::{ChatMessage, ChatPosition, ChatPositionInput},
        game::UserCard,
        room::Room,
        user::{User, UserInput},
    },
    simple_broker::SimpleBroker,
    types::{Card, EntityId, Storage},
};
use async_graphql::*;
use futures_util::{Stream, StreamExt};
use log::info;
use tokio::sync::MutexGuard;
use uuid::Uuid;

#[derive(Clone, Debug, SimpleObject)]
pub struct RoomEvent {
    pub room_id: Uuid,
    pub event_type: String,
    pub target_user_id: Option<Uuid>,
    pub room: Room,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Enum)]
pub enum ReactionKind {
    Celebrate,
    Heart,
    ThumbsUp,
    Laugh,
    Confused,
    RaiseHand,
}

#[derive(Clone, Debug, SimpleObject)]
pub struct RoomReaction {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub reaction: ReactionKind,
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
    pub cards: Vec<String>,
}

#[derive(InputObject)]
pub struct SendChatInput {
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub content: String,
    pub formatted_content: Option<String>,
    pub content_type: String,
    pub position: Option<ChatPositionInput>,
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

        info!(
            "[room] created room_id={} name={} cards={} users=0 rooms_total={}",
            room.id,
            room.name.as_deref().unwrap_or("<unnamed>"),
            room.deck.cards.len(),
            storage.len()
        );

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

                    info!(
                        "[room] user_joined room_id={} user_id={} users_in_room={} owner_id={}",
                        room_id,
                        user.id,
                        room.users.len(),
                        room.room_owner_id
                            .map(|id| id.to_string())
                            .unwrap_or_else(|| "none".to_string())
                    );
                } else {
                    info!(
                        "[room] join_noop room_id={} user_id={} reason=already_joined users_in_room={}",
                        room_id,
                        user.id,
                        room.users.len()
                    );
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

    async fn add_vote_queue_item(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        user_id: EntityId,
        title: String,
    ) -> Result<Room> {
        let title = title.trim();
        if title.is_empty() {
            return Err(Error::new("Queue item title cannot be empty"));
        }
        if title.chars().count() > 140 {
            return Err(Error::new("Queue item title cannot exceed 140 characters"));
        }

        let mut storage = get_storage(ctx).await;
        let room = storage
            .get_mut(&room_id)
            .ok_or_else(|| Error::new("Room not found"))?;
        if room.room_owner_id != Some(user_id) {
            return Err(Error::new("Only the room owner can manage the vote queue"));
        }

        room.add_vote_queue_item(title.to_string());
        room.touch();
        SimpleBroker::publish(room.get_room());
        Ok(room.get_room())
    }

    async fn rename_vote_queue_item(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        user_id: EntityId,
        item_id: EntityId,
        title: String,
    ) -> Result<Room> {
        let title = title.trim();
        if title.is_empty() {
            return Err(Error::new("Queue item title cannot be empty"));
        }
        if title.chars().count() > 140 {
            return Err(Error::new("Queue item title cannot exceed 140 characters"));
        }

        let mut storage = get_storage(ctx).await;
        let room = storage
            .get_mut(&room_id)
            .ok_or_else(|| Error::new("Room not found"))?;
        if room.room_owner_id != Some(user_id) {
            return Err(Error::new("Only the room owner can manage the vote queue"));
        }
        if !room.rename_vote_queue_item(item_id, title.to_string()) {
            return Err(Error::new("Queue item not found"));
        }

        room.touch();
        SimpleBroker::publish(room.get_room());
        Ok(room.get_room())
    }

    async fn remove_vote_queue_item(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        user_id: EntityId,
        item_id: EntityId,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;
        let room = storage
            .get_mut(&room_id)
            .ok_or_else(|| Error::new("Room not found"))?;
        if room.room_owner_id != Some(user_id) {
            return Err(Error::new("Only the room owner can manage the vote queue"));
        }
        if !room.remove_vote_queue_item(item_id) {
            return Err(Error::new("Queue item not found"));
        }

        room.touch();
        SimpleBroker::publish(room.get_room());
        Ok(room.get_room())
    }

    async fn reorder_vote_queue_item(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        user_id: EntityId,
        item_id: EntityId,
        to_index: i32,
    ) -> Result<Room> {
        if to_index < 0 {
            return Err(Error::new("Queue position cannot be negative"));
        }

        let mut storage = get_storage(ctx).await;
        let room = storage
            .get_mut(&room_id)
            .ok_or_else(|| Error::new("Room not found"))?;
        if room.room_owner_id != Some(user_id) {
            return Err(Error::new("Only the room owner can manage the vote queue"));
        }
        if !room.reorder_vote_queue_item(item_id, to_index as usize) {
            return Err(Error::new("Queue item not found"));
        }

        room.touch();
        SimpleBroker::publish(room.get_room());
        Ok(room.get_room())
    }

    async fn set_current_issue_title(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        user_id: EntityId,
        title: Option<String>,
    ) -> Result<Room> {
        let normalized = title
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());
        if normalized
            .as_ref()
            .is_some_and(|value| value.chars().count() > 140)
        {
            return Err(Error::new("Issue title cannot exceed 140 characters"));
        }

        let mut storage = get_storage(ctx).await;
        let room = storage
            .get_mut(&room_id)
            .ok_or_else(|| Error::new("Room not found"))?;
        if room.room_owner_id != Some(user_id) {
            return Err(Error::new(
                "Only the room owner can rename the current issue",
            ));
        }

        room.set_current_issue_title(normalized);
        room.touch();
        SimpleBroker::publish(room.get_room());
        Ok(room.get_room())
    }

    async fn start_next_queue_item(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        user_id: EntityId,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;
        let room = storage
            .get_mut(&room_id)
            .ok_or_else(|| Error::new("Room not found"))?;
        if room.room_owner_id != Some(user_id) {
            return Err(Error::new(
                "Only the room owner can start the next queue item",
            ));
        }
        if !room.is_game_over {
            return Err(Error::new(
                "The next queue item can only start after votes are revealed",
            ));
        }
        if !room.start_next_queue_item() {
            return Err(Error::new("The vote queue is empty"));
        }

        room.touch();
        SimpleBroker::publish(room.get_room());
        Ok(room.get_room())
    }

    async fn start_vote_queue_item(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        user_id: EntityId,
        item_id: EntityId,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;
        let room = storage
            .get_mut(&room_id)
            .ok_or_else(|| Error::new("Room not found"))?;
        if room.room_owner_id != Some(user_id) {
            return Err(Error::new("Only the room owner can start a queued item"));
        }
        if room.is_game_over {
            return Err(Error::new("A queued item cannot replace a completed vote"));
        }
        if !room.start_vote_queue_item(item_id) {
            return Err(Error::new("Queue item not found"));
        }

        room.touch();
        SimpleBroker::publish(room.get_room());
        Ok(room.get_room())
    }

    async fn return_current_vote_queue_item(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        user_id: EntityId,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;
        let room = storage
            .get_mut(&room_id)
            .ok_or_else(|| Error::new("Room not found"))?;
        if room.room_owner_id != Some(user_id) {
            return Err(Error::new("Only the room owner can manage the vote queue"));
        }
        if room.is_game_over {
            return Err(Error::new("A completed vote cannot return to the queue"));
        }
        if !room.return_current_queue_item() {
            return Err(Error::new("The current vote did not come from the queue"));
        }

        room.touch();
        SimpleBroker::publish(room.get_room());
        Ok(room.get_room())
    }

    async fn toggle_countdown_option(
        &self,
        ctx: &Context<'_>,
        room_id: Uuid,
        enabled: bool,
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

            let room = storage
                .get_mut(&room_id)
                .ok_or(Error::new("Room not found"))?;

            if let Some(uid) = user_id
                && Some(uid) != room.room_owner_id
            {
                return Err(Error::new("Only the room owner can start the countdown"));
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
                if let Some(uid) = user_id
                    && Some(uid) != room.room_owner_id
                {
                    return Err(Error::new("Only the room owner can cancel the countdown"));
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
        user_id: Option<Uuid>,
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
        room_id: EntityId,
        user_id: EntityId,
        username: String,
    ) -> Result<User> {
        let mut storage = get_storage(ctx).await;
        let room = storage
            .get_mut(&room_id)
            .ok_or_else(|| Error::new("Room not found"))?;
        let user = room
            .users
            .iter_mut()
            .find(|user| user.id == user_id)
            .ok_or_else(|| Error::new("User not found in room"))?;

        user.username = username;
        let updated_user = user.clone();
        room.touch();
        SimpleBroker::publish(room.get_room());

        Ok(updated_user)
    }

    async fn leave_room(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        user_id: EntityId,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;
        let room = storage
            .get_mut(&room_id)
            .ok_or_else(|| Error::new("Room not found"))?;

        room.remove_user(user_id);
        room.touch();
        SimpleBroker::publish(room.get_room());

        Ok(room.get_room())
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
                if room.lock_votes && room.is_game_over {
                    return Err(Error::new("Votes are locked after they have been revealed"));
                }

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
                    room.record_vote_selection(user_id, &card);
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
                room.reveal_cards();

                room.touch();

                SimpleBroker::publish(room.get_room());

                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn send_reaction(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        user_id: EntityId,
        reaction: ReactionKind,
    ) -> Result<RoomReaction> {
        let mut storage = get_storage(ctx).await;
        let room = storage
            .get_mut(&room_id)
            .ok_or_else(|| Error::new("Room not found"))?;

        if !room.is_user_exist(user_id) {
            return Err(Error::new("User is not in this room"));
        }

        if !room.is_game_over {
            return Err(Error::new(
                "Quick reactions are only available after votes are revealed",
            ));
        }

        let hand_raised = if reaction == ReactionKind::RaiseHand {
            let user = room
                .users
                .iter_mut()
                .find(|user| user.id == user_id)
                .expect("user existence was checked above");
            user.hand_raised = !user.hand_raised;
            Some(user.hand_raised)
        } else {
            None
        };

        room.touch();

        let event = RoomReaction {
            id: Uuid::new_v4(),
            room_id,
            user_id,
            reaction,
        };

        if hand_raised != Some(false) {
            SimpleBroker::publish(event.clone());
        }
        if hand_raised.is_some() {
            SimpleBroker::publish(room.get_room());
        }
        info!(
            "[reaction] sent room_id={} user_id={} reaction={:?} hand_raised={:?} event_id={}",
            room_id, user_id, reaction, hand_raised, event.id
        );

        Ok(event)
    }

    async fn set_vote_uncensored(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        user_id: EntityId,
        uncensored: bool,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;
        let room = storage
            .get_mut(&room_id)
            .ok_or_else(|| Error::new("Room not found"))?;

        if !room.censor_votes {
            return Err(Error::new("Vote censorship is not enabled"));
        }
        if !room.is_game_over {
            return Err(Error::new(
                "Votes can only be uncensored after they are revealed",
            ));
        }

        let user = room
            .users
            .iter_mut()
            .find(|user| user.id == user_id)
            .ok_or_else(|| Error::new("User is not in this room"))?;
        if user.last_card_picked.is_none() {
            return Err(Error::new("User did not vote in this round"));
        }

        user.vote_uncensored = uncensored;
        room.touch();

        SimpleBroker::publish(room.get_room());
        Ok(room.get_room())
    }

    async fn reset_game(&self, ctx: &Context<'_>, room_id: EntityId) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.start_new_round();

                room.touch();

                SimpleBroker::publish(room.get_room());

                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn start_revote(
        &self,
        ctx: &Context<'_>,
        room_id: EntityId,
        user_id: EntityId,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;
        let room = storage
            .get_mut(&room_id)
            .ok_or_else(|| Error::new("Room not found"))?;

        if room.room_owner_id != Some(user_id) {
            return Err(Error::new("Only the room owner can start a revote"));
        }
        if !room.lock_votes {
            return Err(Error::new("Vote locking is not enabled"));
        }
        if !room.start_revote_round() {
            return Err(Error::new(
                "A revote can only start after votes are revealed",
            ));
        }

        room.touch();
        SimpleBroker::publish(room.get_room());
        Ok(room.get_room())
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

    async fn toggle_show_vote_changes(
        &self,
        ctx: &Context<'_>,
        room_id: Uuid,
        enabled: bool,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.toggle_show_vote_changes(enabled);

                room.touch();

                SimpleBroker::publish(room.get_room());
                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn toggle_censor_votes(
        &self,
        ctx: &Context<'_>,
        room_id: Uuid,
        enabled: bool,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.toggle_censor_votes(enabled);

                room.touch();

                SimpleBroker::publish(room.get_room());
                Ok(room.get_room())
            }
            None => Err(Error::new("Room not found")),
        }
    }

    async fn toggle_lock_votes(
        &self,
        ctx: &Context<'_>,
        room_id: Uuid,
        enabled: bool,
    ) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.toggle_lock_votes(enabled);

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
        let username = room
            .users
            .iter()
            .find(|user| user.id == input.user_id)
            .map(|user| user.username.clone())
            .ok_or_else(|| Error::new("User not found in room"))?;

        let msg = ChatMessage::new(
            input.room_id,
            input.user_id,
            username,
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
        SimpleBroker::<ChatMessage>::subscribe().filter(move |msg| {
            let same_room = msg.room_id == room_id;
            async move { same_room }
        })
    }

    async fn room_reactions(&self, room_id: Uuid) -> impl Stream<Item = RoomReaction> {
        SimpleBroker::<RoomReaction>::subscribe().filter(move |event| {
            let same_room = event.room_id == room_id;
            async move { same_room }
        })
    }
}

#[cfg(test)]
mod schema_tests {
    use std::{collections::HashMap, sync::Arc};

    use async_graphql::{Request, Schema};
    use tokio::sync::Mutex;

    use super::{MutationRoot, QueryRoot, SubscriptionRoot};
    use crate::{
        domain::{room::Room, user::User},
        types::Storage,
    };

    fn schema_with_room(
        is_game_over: bool,
    ) -> (
        Schema<QueryRoot, MutationRoot, SubscriptionRoot>,
        uuid::Uuid,
        uuid::Uuid,
    ) {
        let mut room = Room::new(None, vec!["1".to_string(), "2".to_string()]);
        let user = User::new("Reaction Tester".to_string());
        let room_id = room.id;
        let user_id = user.id;
        room.users.push(user);
        room.room_owner_id = Some(user_id);
        room.is_game_over = is_game_over;

        let storage: Storage = Arc::new(Mutex::new(HashMap::from([(room_id, room)])));
        let schema = Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)
            .data(storage)
            .finish();

        (schema, room_id, user_id)
    }

    #[tokio::test]
    async fn room_scoped_user_changes_do_not_affect_another_room() {
        let shared_user = User::new("Shared Name".to_string());
        let shared_user_id = shared_user.id;
        let room_a_successor = User::new("Room A Successor".to_string());
        let room_a_successor_id = room_a_successor.id;
        let room_b_successor = User::new("Room B Successor".to_string());

        let mut room_a = Room::new(Some("Room A".to_string()), vec!["1".to_string()]);
        room_a.users = vec![shared_user.clone(), room_a_successor];
        room_a.room_owner_id = Some(shared_user_id);
        let room_a_id = room_a.id;

        let mut room_b = Room::new(Some("Room B".to_string()), vec!["2".to_string()]);
        room_b.users = vec![shared_user, room_b_successor];
        room_b.room_owner_id = Some(shared_user_id);
        let room_b_id = room_b.id;

        let storage: Storage = Arc::new(Mutex::new(HashMap::from([
            (room_a_id, room_a),
            (room_b_id, room_b),
        ])));
        let schema = Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)
            .data(storage)
            .finish();

        let edit_response = schema
            .execute(Request::new(format!(
                "mutation {{ editUser(roomId: \"{room_a_id}\", userId: \"{shared_user_id}\", username: \"Room A Name\") {{ username }} }}"
            )))
            .await;
        assert!(
            edit_response.errors.is_empty(),
            "{:?}",
            edit_response.errors
        );

        let vote_response = schema
            .execute(Request::new(format!(
                "mutation {{ pickCard(roomId: \"{room_a_id}\", userId: \"{shared_user_id}\", card: \"1\") {{ id }} }}"
            )))
            .await;
        assert!(
            vote_response.errors.is_empty(),
            "{:?}",
            vote_response.errors
        );

        let rooms_response = schema
            .execute(Request::new(format!(
                "query {{
                    roomA: roomById(roomId: \"{room_a_id}\") {{
                        users {{ id username lastCardPicked }}
                    }}
                    roomB: roomById(roomId: \"{room_b_id}\") {{
                        users {{ id username lastCardPicked }}
                        game {{ table {{ userId }} }}
                    }}
                }}"
            )))
            .await;
        assert!(
            rooms_response.errors.is_empty(),
            "{:?}",
            rooms_response.errors
        );
        let rooms_data = rooms_response
            .data
            .into_json()
            .expect("room data should be JSON");

        assert_eq!(rooms_data["roomA"]["users"][0]["username"], "Room A Name");
        assert_eq!(rooms_data["roomA"]["users"][0]["lastCardPicked"], "1");
        assert_eq!(rooms_data["roomB"]["users"][0]["username"], "Shared Name");
        assert!(rooms_data["roomB"]["users"][0]["lastCardPicked"].is_null());
        assert_eq!(
            rooms_data["roomB"]["game"]["table"]
                .as_array()
                .expect("room B table should be an array")
                .len(),
            0
        );

        let leave_response = schema
            .execute(Request::new(format!(
                "mutation {{ leaveRoom(roomId: \"{room_a_id}\", userId: \"{shared_user_id}\") {{ roomOwnerId users {{ id }} }} }}"
            )))
            .await;
        assert!(
            leave_response.errors.is_empty(),
            "{:?}",
            leave_response.errors
        );
        let leave_data = leave_response
            .data
            .into_json()
            .expect("leave data should be JSON");
        assert_eq!(
            leave_data["leaveRoom"]["roomOwnerId"],
            room_a_successor_id.to_string()
        );
        assert!(
            leave_data["leaveRoom"]["users"]
                .as_array()
                .expect("room A users should be an array")
                .iter()
                .all(|user| user["id"] != shared_user_id.to_string())
        );

        let room_b_response = schema
            .execute(Request::new(format!(
                "query {{ roomById(roomId: \"{room_b_id}\") {{ roomOwnerId users {{ id username }} }} }}"
            )))
            .await;
        let room_b_data = room_b_response
            .data
            .into_json()
            .expect("room B data should be JSON");
        assert_eq!(
            room_b_data["roomById"]["roomOwnerId"],
            shared_user_id.to_string()
        );
        assert_eq!(
            room_b_data["roomById"]["users"][0]["id"],
            shared_user_id.to_string()
        );
        assert_eq!(
            room_b_data["roomById"]["users"][0]["username"],
            "Shared Name"
        );
    }

    #[tokio::test]
    async fn kicking_a_user_and_reassigning_ownership_is_room_scoped() {
        let shared_user = User::new("Shared User".to_string());
        let shared_user_id = shared_user.id;
        let successor = User::new("Successor".to_string());
        let successor_id = successor.id;

        let mut room_a = Room::new(None, vec!["1".to_string()]);
        room_a.users = vec![shared_user.clone(), successor];
        room_a.room_owner_id = Some(shared_user_id);
        let room_a_id = room_a.id;

        let mut room_b = Room::new(None, vec!["2".to_string()]);
        room_b.users = vec![shared_user];
        room_b.room_owner_id = Some(shared_user_id);
        let room_b_id = room_b.id;

        let storage: Storage = Arc::new(Mutex::new(HashMap::from([
            (room_a_id, room_a),
            (room_b_id, room_b),
        ])));
        let schema = Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)
            .data(storage)
            .finish();

        let kick_response = schema
            .execute(Request::new(format!(
                "mutation {{ kickUser(roomId: \"{room_a_id}\", targetUserId: \"{shared_user_id}\") {{ roomOwnerId users {{ id }} }} }}"
            )))
            .await;
        assert!(
            kick_response.errors.is_empty(),
            "{:?}",
            kick_response.errors
        );
        let kick_data = kick_response
            .data
            .into_json()
            .expect("kick data should be JSON");
        assert_eq!(
            kick_data["kickUser"]["roomOwnerId"],
            successor_id.to_string()
        );

        let room_b_response = schema
            .execute(Request::new(format!(
                "query {{ roomById(roomId: \"{room_b_id}\") {{ roomOwnerId users {{ id }} }} }}"
            )))
            .await;
        let room_b_data = room_b_response
            .data
            .into_json()
            .expect("room B data should be JSON");
        assert_eq!(
            room_b_data["roomById"]["roomOwnerId"],
            shared_user_id.to_string()
        );
        assert_eq!(
            room_b_data["roomById"]["users"][0]["id"],
            shared_user_id.to_string()
        );
    }

    #[tokio::test]
    async fn reset_game_archives_each_completed_round_once() {
        let mut room = Room::new(
            None,
            vec!["3".to_string(), "5".to_string(), "8".to_string()],
        );
        let mut adjusted_voter = User::new("Adjusted Voter".to_string());
        adjusted_voter.last_card_picked = Some("8".to_string());
        adjusted_voter.last_card_value = Some(8.0);
        adjusted_voter.previous_card_picked = Some("3".to_string());
        adjusted_voter.previous_card_value = Some(3.0);
        let adjusted_voter_id = adjusted_voter.id;

        let non_voter = User::new("Non-voter".to_string());
        let non_voter_id = non_voter.id;

        let room_id = room.id;
        room.users = vec![adjusted_voter, non_voter];
        room.is_game_over = true;

        let storage: Storage = Arc::new(Mutex::new(HashMap::from([(room_id, room)])));
        let schema = Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)
            .data(storage.clone())
            .finish();

        let first_reset = schema
            .execute(Request::new(format!(
                "mutation {{ resetGame(roomId: \"{room_id}\") {{ isGameOver }} }}"
            )))
            .await;
        assert!(first_reset.errors.is_empty(), "{:?}", first_reset.errors);

        {
            let stored_rooms = storage.lock().await;
            let stored_room = stored_rooms
                .get(&room_id)
                .expect("room should remain in storage");
            assert_eq!(stored_room.vote_history.len(), 1);

            let first_round = &stored_room.vote_history[0];
            assert_eq!(first_round.round_number, 1);
            assert!(!first_round.id.is_nil());
            assert_eq!(first_round.votes.len(), 2);

            let adjusted_vote = first_round
                .votes
                .iter()
                .find(|vote| vote.user_id == adjusted_voter_id)
                .expect("adjusted voter should be archived");
            assert_eq!(adjusted_vote.username, "Adjusted Voter");
            assert_eq!(adjusted_vote.card.as_deref(), Some("8"));
            assert_eq!(adjusted_vote.value, Some(8.0));

            let missing_vote = first_round
                .votes
                .iter()
                .find(|vote| vote.user_id == non_voter_id)
                .expect("non-voter should be archived");
            assert_eq!(missing_vote.username, "Non-voter");
            assert_eq!(missing_vote.card, None);
            assert_eq!(missing_vote.value, None);

            let reset_user = stored_room
                .users
                .iter()
                .find(|user| user.id == adjusted_voter_id)
                .expect("adjusted voter should remain in the room");
            assert_eq!(reset_user.last_card_picked, None);
            assert_eq!(reset_user.last_card_value, None);
        }

        let repeated_reset = schema
            .execute(Request::new(format!(
                "mutation {{ resetGame(roomId: \"{room_id}\") {{ isGameOver }} }}"
            )))
            .await;
        assert!(
            repeated_reset.errors.is_empty(),
            "{:?}",
            repeated_reset.errors
        );
        assert_eq!(
            storage
                .lock()
                .await
                .get(&room_id)
                .expect("room should remain in storage")
                .vote_history
                .len(),
            1
        );

        for mutation in [
            format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{adjusted_voter_id}\", card: \"5\") {{ id }} }}"
            ),
            format!("mutation {{ showCards(roomId: \"{room_id}\") {{ isGameOver }} }}"),
            format!("mutation {{ resetGame(roomId: \"{room_id}\") {{ isGameOver }} }}"),
        ] {
            let response = schema.execute(Request::new(mutation)).await;
            assert!(response.errors.is_empty(), "{:?}", response.errors);
        }

        let stored_rooms = storage.lock().await;
        let stored_room = stored_rooms
            .get(&room_id)
            .expect("room should remain in storage");
        assert_eq!(stored_room.vote_history.len(), 2);
        assert_eq!(stored_room.vote_history[1].round_number, 2);
        assert_ne!(
            stored_room.vote_history[0].id,
            stored_room.vote_history[1].id
        );

        let second_round_vote = stored_room.vote_history[1]
            .votes
            .iter()
            .find(|vote| vote.user_id == adjusted_voter_id)
            .expect("second-round vote should be archived");
        assert_eq!(second_round_vote.card.as_deref(), Some("5"));
        assert_eq!(second_round_vote.value, Some(5.0));
    }

    #[tokio::test]
    async fn locked_rounds_reject_changes_and_revotes_expose_the_previous_round() {
        let mut room = Room::new(
            None,
            vec!["3".to_string(), "5".to_string(), "8".to_string()],
        );
        let first_voter = User::new("First Voter".to_string());
        let first_voter_id = first_voter.id;
        let second_voter = User::new("Second Voter".to_string());
        let second_voter_id = second_voter.id;
        let room_id = room.id;
        room.users = vec![first_voter, second_voter];
        room.room_owner_id = Some(first_voter_id);

        let storage: Storage = Arc::new(Mutex::new(HashMap::from([(room_id, room)])));
        let schema = Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)
            .data(storage.clone())
            .finish();

        let initial = schema
            .execute(Request::new(format!(
                "query {{ roomById(roomId: \"{room_id}\") {{ lockVotes previousRound {{ id }} }} }}"
            )))
            .await;
        assert!(initial.errors.is_empty(), "{:?}", initial.errors);
        let initial_data = initial.data.into_json().expect("room data should be JSON");
        assert_eq!(initial_data["roomById"]["lockVotes"], false);
        assert!(initial_data["roomById"]["previousRound"].is_null());

        for mutation in [
            format!(
                "mutation {{ toggleLockVotes(roomId: \"{room_id}\", enabled: true) {{ lockVotes }} }}"
            ),
            format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{first_voter_id}\", card: \"3\") {{ id }} }}"
            ),
            format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{second_voter_id}\", card: \"8\") {{ id }} }}"
            ),
            format!("mutation {{ showCards(roomId: \"{room_id}\") {{ isGameOver }} }}"),
        ] {
            let response = schema.execute(Request::new(mutation)).await;
            assert!(response.errors.is_empty(), "{:?}", response.errors);
        }

        let locked_change = schema
            .execute(Request::new(format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{first_voter_id}\", card: \"5\") {{ id }} }}"
            )))
            .await;
        assert_eq!(locked_change.errors.len(), 1);
        assert!(
            locked_change.errors[0]
                .message
                .contains("locked after they have been revealed")
        );

        let revote = schema
            .execute(Request::new(format!(
                "mutation {{ startRevote(roomId: \"{room_id}\", userId: \"{first_voter_id}\") {{
                    isGameOver
                    previousRound {{
                        roundNumber
                        votes {{ userId username card value }}
                    }}
                }} }}"
            )))
            .await;
        assert!(revote.errors.is_empty(), "{:?}", revote.errors);
        let revote_data = revote
            .data
            .into_json()
            .expect("revote room data should be JSON");
        let revote_room = &revote_data["startRevote"];
        assert_eq!(revote_room["isGameOver"], false);
        assert_eq!(revote_room["previousRound"]["roundNumber"], 1);
        assert_eq!(revote_room["previousRound"]["votes"][0]["card"], "3");
        assert_eq!(revote_room["previousRound"]["votes"][1]["card"], "8");

        for mutation in [
            format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{first_voter_id}\", card: \"5\") {{ id }} }}"
            ),
            format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{second_voter_id}\", card: \"5\") {{ id }} }}"
            ),
            format!(
                "mutation {{ showCards(roomId: \"{room_id}\") {{
                    isGameOver
                    game {{ table {{ userId card }} }}
                    previousRound {{ votes {{ userId card }} }}
                }} }}"
            ),
        ] {
            let response = schema.execute(Request::new(mutation)).await;
            assert!(response.errors.is_empty(), "{:?}", response.errors);
            if let Ok(data) = response.data.clone().into_json()
                && data.get("showCards").is_some()
            {
                assert_eq!(data["showCards"]["game"]["table"][0]["card"], "5");
                assert_eq!(data["showCards"]["game"]["table"][1]["card"], "5");
                assert_eq!(data["showCards"]["previousRound"]["votes"][0]["card"], "3");
                assert_eq!(data["showCards"]["previousRound"]["votes"][1]["card"], "8");
            }
        }

        {
            let stored_rooms = storage.lock().await;
            let stored_room = stored_rooms
                .get(&room_id)
                .expect("room should remain in storage");
            assert!(stored_room.vote_history.is_empty());
            assert!(stored_room.previous_round.is_some());
        }

        for mutation in [
            format!(
                "mutation {{ startRevote(roomId: \"{room_id}\", userId: \"{first_voter_id}\") {{ isGameOver }} }}"
            ),
            format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{first_voter_id}\", card: \"8\") {{ id }} }}"
            ),
            format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{second_voter_id}\", card: \"3\") {{ id }} }}"
            ),
            format!("mutation {{ showCards(roomId: \"{room_id}\") {{ isGameOver }} }}"),
            format!("mutation {{ resetGame(roomId: \"{room_id}\") {{ isGameOver }} }}"),
        ] {
            let response = schema.execute(Request::new(mutation)).await;
            assert!(response.errors.is_empty(), "{:?}", response.errors);
        }

        let stored_rooms = storage.lock().await;
        let stored_room = stored_rooms
            .get(&room_id)
            .expect("room should remain in storage");
        assert_eq!(stored_room.vote_history.len(), 1);
        assert!(stored_room.previous_round.is_none());

        let round = &stored_room.vote_history[0];
        assert_eq!(round.round_number, 1);

        let first_vote = round
            .votes
            .iter()
            .find(|vote| vote.user_id == first_voter_id)
            .expect("first voter should be archived");
        assert_eq!(first_vote.card.as_deref(), Some("8"));
        assert_eq!(
            first_vote
                .selections
                .iter()
                .map(|selection| selection.card.as_str())
                .collect::<Vec<_>>(),
            vec!["3", "5", "8"]
        );

        let second_vote = round
            .votes
            .iter()
            .find(|vote| vote.user_id == second_voter_id)
            .expect("second voter should be archived");
        assert_eq!(second_vote.card.as_deref(), Some("3"));
        assert_eq!(
            second_vote
                .selections
                .iter()
                .map(|selection| selection.card.as_str())
                .collect::<Vec<_>>(),
            vec!["8", "5", "3"]
        );
    }

    #[tokio::test]
    async fn reactions_require_a_revealed_round() {
        let (schema, room_id, user_id) = schema_with_room(false);
        let response = schema
            .execute(Request::new(format!(
                "mutation {{ sendReaction(roomId: \"{room_id}\", userId: \"{user_id}\", reaction: CELEBRATE) {{ id }} }}"
            )))
            .await;

        assert_eq!(response.errors.len(), 1);
        assert!(
            response.errors[0]
                .message
                .contains("only available after votes are revealed")
        );
    }

    #[tokio::test]
    async fn revealed_round_thumbs_up_reactions_return_a_room_scoped_event() {
        let (schema, room_id, user_id) = schema_with_room(true);
        let response = schema
            .execute(Request::new(format!(
                "mutation {{ sendReaction(roomId: \"{room_id}\", userId: \"{user_id}\", reaction: THUMBS_UP) {{ roomId userId reaction }} }}"
            )))
            .await;

        assert!(response.errors.is_empty(), "{:?}", response.errors);
        let data = response
            .data
            .into_json()
            .expect("reaction data should be JSON");
        assert_eq!(data["sendReaction"]["roomId"], room_id.to_string());
        assert_eq!(data["sendReaction"]["userId"], user_id.to_string());
        assert_eq!(data["sendReaction"]["reaction"], "THUMBS_UP");
    }

    #[tokio::test]
    async fn vote_change_visibility_defaults_on_and_can_be_disabled() {
        let (schema, room_id, _) = schema_with_room(false);

        let initial = schema
            .execute(Request::new(format!(
                "query {{ roomById(roomId: \"{room_id}\") {{ showVoteChanges }} }}"
            )))
            .await;
        assert!(initial.errors.is_empty(), "{:?}", initial.errors);
        let initial_data = initial
            .data
            .into_json()
            .expect("initial room data should be JSON");
        assert_eq!(initial_data["roomById"]["showVoteChanges"], true);

        let updated = schema
            .execute(Request::new(format!(
                "mutation {{ toggleShowVoteChanges(roomId: \"{room_id}\", enabled: false) {{ showVoteChanges }} }}"
            )))
            .await;
        assert!(updated.errors.is_empty(), "{:?}", updated.errors);
        let updated_data = updated
            .data
            .into_json()
            .expect("updated room data should be JSON");
        assert_eq!(
            updated_data["toggleShowVoteChanges"]["showVoteChanges"],
            false
        );
    }

    #[tokio::test]
    async fn vote_censorship_defaults_off_and_can_be_enabled() {
        let (schema, room_id, _) = schema_with_room(false);

        let initial = schema
            .execute(Request::new(format!(
                "query {{ roomById(roomId: \"{room_id}\") {{ censorVotes }} }}"
            )))
            .await;
        assert!(initial.errors.is_empty(), "{:?}", initial.errors);
        let initial_data = initial
            .data
            .into_json()
            .expect("initial room data should be JSON");
        assert_eq!(initial_data["roomById"]["censorVotes"], false);

        let updated = schema
            .execute(Request::new(format!(
                "mutation {{ toggleCensorVotes(roomId: \"{room_id}\", enabled: true) {{ censorVotes }} }}"
            )))
            .await;
        assert!(updated.errors.is_empty(), "{:?}", updated.errors);
        let updated_data = updated
            .data
            .into_json()
            .expect("updated room data should be JSON");
        assert_eq!(updated_data["toggleCensorVotes"]["censorVotes"], true);
    }

    #[tokio::test]
    async fn players_can_uncensor_their_vote_until_the_round_resets() {
        let (schema, room_id, user_id) = schema_with_room(false);

        for mutation in [
            format!(
                "mutation {{ toggleCensorVotes(roomId: \"{room_id}\", enabled: true) {{ censorVotes }} }}"
            ),
            format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{user_id}\", card: \"5\") {{ id }} }}"
            ),
            format!("mutation {{ showCards(roomId: \"{room_id}\") {{ isGameOver }} }}"),
        ] {
            let response = schema.execute(Request::new(mutation)).await;
            assert!(response.errors.is_empty(), "{:?}", response.errors);
        }

        let uncensored = schema
            .execute(Request::new(format!(
                "mutation {{ setVoteUncensored(roomId: \"{room_id}\", userId: \"{user_id}\", uncensored: true) {{ users {{ id voteUncensored }} }} }}"
            )))
            .await;
        assert!(uncensored.errors.is_empty(), "{:?}", uncensored.errors);
        let uncensored_data = uncensored
            .data
            .into_json()
            .expect("uncensored room data should be JSON");
        assert_eq!(
            uncensored_data["setVoteUncensored"]["users"][0]["voteUncensored"],
            true
        );

        let reset = schema
            .execute(Request::new(format!(
                "mutation {{ resetGame(roomId: \"{room_id}\") {{ users {{ voteUncensored }} }} }}"
            )))
            .await;
        assert!(reset.errors.is_empty(), "{:?}", reset.errors);
        let reset_data = reset
            .data
            .into_json()
            .expect("reset room data should be JSON");
        assert_eq!(reset_data["resetGame"]["users"][0]["voteUncensored"], false);
    }

    #[tokio::test]
    async fn raised_hand_toggles_and_reset_game_clears_it() {
        let (schema, room_id, user_id) = schema_with_room(true);

        let raise_response = schema
            .execute(Request::new(format!(
                "mutation {{ sendReaction(roomId: \"{room_id}\", userId: \"{user_id}\", reaction: RAISE_HAND) {{ reaction }} }}"
            )))
            .await;
        assert!(
            raise_response.errors.is_empty(),
            "{:?}",
            raise_response.errors
        );

        let raised_room = schema
            .execute(Request::new(format!(
                "query {{ roomById(roomId: \"{room_id}\") {{ users {{ id handRaised }} }} }}"
            )))
            .await;
        let raised_data = raised_room
            .data
            .into_json()
            .expect("raised room data should be JSON");
        assert_eq!(raised_data["roomById"]["users"][0]["handRaised"], true);

        let lower_response = schema
            .execute(Request::new(format!(
                "mutation {{ sendReaction(roomId: \"{room_id}\", userId: \"{user_id}\", reaction: RAISE_HAND) {{ reaction }} }}"
            )))
            .await;
        assert!(
            lower_response.errors.is_empty(),
            "{:?}",
            lower_response.errors
        );

        let lowered_room = schema
            .execute(Request::new(format!(
                "query {{ roomById(roomId: \"{room_id}\") {{ users {{ handRaised }} }} }}"
            )))
            .await;
        let lowered_data = lowered_room
            .data
            .into_json()
            .expect("lowered room data should be JSON");
        assert_eq!(lowered_data["roomById"]["users"][0]["handRaised"], false);

        let _ = schema
            .execute(Request::new(format!(
                "mutation {{ sendReaction(roomId: \"{room_id}\", userId: \"{user_id}\", reaction: RAISE_HAND) {{ reaction }} }}"
            )))
            .await;
        let reset_response = schema
            .execute(Request::new(format!(
                "mutation {{ resetGame(roomId: \"{room_id}\") {{ users {{ handRaised }} }} }}"
            )))
            .await;
        let reset_data = reset_response
            .data
            .into_json()
            .expect("reset room data should be JSON");
        assert_eq!(reset_data["resetGame"]["users"][0]["handRaised"], false);
    }

    #[tokio::test]
    async fn post_reveal_vote_changes_keep_the_original_revealed_vote() {
        let (schema, room_id, user_id) = schema_with_room(false);

        let first_vote = schema
            .execute(Request::new(format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{user_id}\", card: \"1\") {{ users {{ lastCardPicked previousCardPicked }} }} }}"
            )))
            .await;
        assert!(first_vote.errors.is_empty(), "{:?}", first_vote.errors);

        let reveal = schema
            .execute(Request::new(format!(
                "mutation {{ showCards(roomId: \"{room_id}\") {{ isGameOver users {{ previousCardPicked previousCardValue }} }} }}"
            )))
            .await;
        assert!(reveal.errors.is_empty(), "{:?}", reveal.errors);
        let reveal_data = reveal
            .data
            .into_json()
            .expect("revealed vote data should be JSON");
        let revealed_user = &reveal_data["showCards"]["users"][0];
        assert_eq!(revealed_user["previousCardPicked"], "1");
        assert_eq!(revealed_user["previousCardValue"].as_f64(), Some(1.0));

        let changed_vote = schema
            .execute(Request::new(format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{user_id}\", card: \"2\") {{ users {{ lastCardPicked lastCardValue previousCardPicked previousCardValue }} }} }}"
            )))
            .await;
        assert!(changed_vote.errors.is_empty(), "{:?}", changed_vote.errors);
        let changed_data = changed_vote
            .data
            .into_json()
            .expect("changed vote data should be JSON");
        let changed_user = &changed_data["pickCard"]["users"][0];
        assert_eq!(changed_user["lastCardPicked"], "2");
        assert_eq!(changed_user["lastCardValue"].as_f64(), Some(2.0));
        assert_eq!(changed_user["previousCardPicked"], "1");
        assert_eq!(changed_user["previousCardValue"].as_f64(), Some(1.0));

        let changed_again = schema
            .execute(Request::new(format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{user_id}\", card: \"8\") {{ users {{ lastCardPicked previousCardPicked }} }} }}"
            )))
            .await;
        assert!(
            changed_again.errors.is_empty(),
            "{:?}",
            changed_again.errors
        );
        let changed_again_data = changed_again
            .data
            .into_json()
            .expect("second changed vote data should be JSON");
        let changed_again_user = &changed_again_data["pickCard"]["users"][0];
        assert_eq!(changed_again_user["lastCardPicked"], "8");
        assert_eq!(changed_again_user["previousCardPicked"], "1");

        let returned_to_original = schema
            .execute(Request::new(format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{user_id}\", card: \"1\") {{ users {{ lastCardPicked previousCardPicked }} }} }}"
            )))
            .await;
        assert!(
            returned_to_original.errors.is_empty(),
            "{:?}",
            returned_to_original.errors
        );
        let returned_to_original_data = returned_to_original
            .data
            .into_json()
            .expect("original vote data should be JSON");
        let original_user = &returned_to_original_data["pickCard"]["users"][0];
        assert_eq!(original_user["lastCardPicked"], "1");
        assert_eq!(original_user["previousCardPicked"], "1");

        let reset = schema
            .execute(Request::new(format!(
                "mutation {{ resetGame(roomId: \"{room_id}\") {{ users {{ previousCardPicked previousCardValue }} }} }}"
            )))
            .await;
        assert!(reset.errors.is_empty(), "{:?}", reset.errors);
        let reset_data = reset
            .data
            .into_json()
            .expect("reset vote data should be JSON");
        assert!(reset_data["resetGame"]["users"][0]["previousCardPicked"].is_null());
        assert!(reset_data["resetGame"]["users"][0]["previousCardValue"].is_null());
    }

    #[tokio::test]
    async fn vote_sessions_archive_issue_titles_and_selection_changes() {
        let (schema, room_id, user_id) = schema_with_room(false);

        for mutation in [
            format!(
                "mutation {{ setCurrentIssueTitle(roomId: \"{room_id}\", userId: \"{user_id}\", title: \"Checkout validation\") {{ currentIssueTitle }} }}"
            ),
            format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{user_id}\", card: \"3\") {{ id }} }}"
            ),
            format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{user_id}\", card: \"5\") {{ id }} }}"
            ),
            format!("mutation {{ showCards(roomId: \"{room_id}\") {{ isGameOver }} }}"),
            format!("mutation {{ resetGame(roomId: \"{room_id}\") {{ id }} }}"),
        ] {
            let response = schema.execute(Request::new(mutation)).await;
            assert!(response.errors.is_empty(), "{:?}", response.errors);
        }

        let history = schema
            .execute(Request::new(format!(
                "query {{ roomById(roomId: \"{room_id}\") {{
                    currentIssueTitle
                    voteHistory {{
                        issueTitle
                        revoteCount
                        votes {{ card selections {{ card value phase }} }}
                    }}
                }} }}"
            )))
            .await;
        assert!(history.errors.is_empty(), "{:?}", history.errors);
        let data = history.data.into_json().expect("history should be JSON");
        let room = &data["roomById"];
        assert!(room["currentIssueTitle"].is_null());
        assert_eq!(room["voteHistory"][0]["issueTitle"], "Checkout validation");
        assert_eq!(room["voteHistory"][0]["revoteCount"], 0);
        assert_eq!(room["voteHistory"][0]["votes"][0]["card"], "5");
        assert_eq!(
            room["voteHistory"][0]["votes"][0]["selections"][0]["card"],
            "3"
        );
        assert_eq!(
            room["voteHistory"][0]["votes"][0]["selections"][0]["phase"],
            0
        );
        assert_eq!(
            room["voteHistory"][0]["votes"][0]["selections"][1]["card"],
            "5"
        );
    }

    #[tokio::test]
    async fn queued_issue_revotes_archive_as_one_history_entry() {
        let (schema, room_id, user_id) = schema_with_room(false);

        for mutation in [
            format!(
                "mutation {{ toggleLockVotes(roomId: \"{room_id}\", enabled: true) {{ lockVotes }} }}"
            ),
            format!(
                "mutation {{ addVoteQueueItem(roomId: \"{room_id}\", userId: \"{user_id}\", title: \"Checkout validation\") {{ id }} }}"
            ),
            format!(
                "mutation {{ addVoteQueueItem(roomId: \"{room_id}\", userId: \"{user_id}\", title: \"Declined card messaging\") {{ id }} }}"
            ),
            format!("mutation {{ showCards(roomId: \"{room_id}\") {{ isGameOver }} }}"),
            format!(
                "mutation {{ startNextQueueItem(roomId: \"{room_id}\", userId: \"{user_id}\") {{ currentIssueTitle }} }}"
            ),
            format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{user_id}\", card: \"3\") {{ id }} }}"
            ),
            format!("mutation {{ showCards(roomId: \"{room_id}\") {{ isGameOver }} }}"),
            format!(
                "mutation {{ startRevote(roomId: \"{room_id}\", userId: \"{user_id}\") {{ isGameOver }} }}"
            ),
            format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{user_id}\", card: \"5\") {{ id }} }}"
            ),
            format!("mutation {{ showCards(roomId: \"{room_id}\") {{ isGameOver }} }}"),
        ] {
            let response = schema.execute(Request::new(mutation)).await;
            assert!(response.errors.is_empty(), "{:?}", response.errors);
        }

        let next = schema
            .execute(Request::new(format!(
                "mutation {{ startNextQueueItem(roomId: \"{room_id}\", userId: \"{user_id}\") {{
                    currentIssueTitle
                    voteHistory {{
                        issueTitle
                        revoteCount
                        votes {{ card selections {{ card phase }} }}
                    }}
                }} }}"
            )))
            .await;
        assert!(next.errors.is_empty(), "{:?}", next.errors);
        let data = next.data.into_json().expect("queue result should be JSON");
        let room = &data["startNextQueueItem"];

        assert_eq!(room["currentIssueTitle"], "Declined card messaging");
        assert_eq!(room["voteHistory"].as_array().map(Vec::len), Some(2));
        assert_eq!(room["voteHistory"][1]["issueTitle"], "Checkout validation");
        assert_eq!(room["voteHistory"][1]["revoteCount"], 1);
        assert_eq!(room["voteHistory"][1]["votes"][0]["card"], "5");
        assert_eq!(
            room["voteHistory"][1]["votes"][0]["selections"][0]["card"],
            "3"
        );
        assert_eq!(
            room["voteHistory"][1]["votes"][0]["selections"][0]["phase"],
            0
        );
        assert_eq!(
            room["voteHistory"][1]["votes"][0]["selections"][1]["card"],
            "5"
        );
        assert_eq!(
            room["voteHistory"][1]["votes"][0]["selections"][1]["phase"],
            1
        );
    }

    #[tokio::test]
    async fn room_owner_can_start_the_next_queued_issue() {
        let (schema, room_id, user_id) = schema_with_room(false);

        for title in ["Save payment methods", "Declined card messaging"] {
            let response = schema
                .execute(Request::new(format!(
                    "mutation {{ addVoteQueueItem(roomId: \"{room_id}\", userId: \"{user_id}\", title: \"{title}\") {{
                        voteQueue {{ title }}
                    }} }}"
                )))
                .await;
            assert!(response.errors.is_empty(), "{:?}", response.errors);
        }

        for mutation in [
            format!(
                "mutation {{ pickCard(roomId: \"{room_id}\", userId: \"{user_id}\", card: \"3\") {{ id }} }}"
            ),
            format!("mutation {{ showCards(roomId: \"{room_id}\") {{ isGameOver }} }}"),
        ] {
            let response = schema.execute(Request::new(mutation)).await;
            assert!(response.errors.is_empty(), "{:?}", response.errors);
        }

        let next = schema
            .execute(Request::new(format!(
                "mutation {{ startNextQueueItem(roomId: \"{room_id}\", userId: \"{user_id}\") {{
                    isGameOver
                    currentIssueTitle
                    voteQueue {{ title }}
                    voteHistory {{ issueTitle }}
                }} }}"
            )))
            .await;
        assert!(next.errors.is_empty(), "{:?}", next.errors);
        let data = next
            .data
            .into_json()
            .expect("next queue item should be JSON");
        let room = &data["startNextQueueItem"];
        assert_eq!(room["isGameOver"], false);
        assert_eq!(room["currentIssueTitle"], "Save payment methods");
        assert_eq!(room["voteQueue"][0]["title"], "Declined card messaging");
        assert_eq!(room["voteHistory"].as_array().map(Vec::len), Some(1));
    }

    #[tokio::test]
    async fn room_owner_can_start_a_specific_queued_issue_during_open_voting() {
        let (schema, room_id, user_id) = schema_with_room(false);
        let mut selected_id = String::new();

        for title in ["First issue", "Selected issue"] {
            let response = schema
                .execute(Request::new(format!(
                    "mutation {{ addVoteQueueItem(roomId: \"{room_id}\", userId: \"{user_id}\", title: \"{title}\") {{
                        voteQueue {{ id title }}
                    }} }}"
                )))
                .await;
            assert!(response.errors.is_empty(), "{:?}", response.errors);
            let data = response
                .data
                .into_json()
                .expect("queue item result should be JSON");
            if title == "Selected issue" {
                selected_id = data["addVoteQueueItem"]["voteQueue"][1]["id"]
                    .as_str()
                    .expect("queue item id should be a string")
                    .to_string();
            }
        }

        let response = schema
            .execute(Request::new(format!(
                "mutation {{ startVoteQueueItem(roomId: \"{room_id}\", userId: \"{user_id}\", itemId: \"{selected_id}\") {{
                    isGameOver
                    currentIssueTitle
                    voteQueue {{ title }}
                }} }}"
            )))
            .await;
        assert!(response.errors.is_empty(), "{:?}", response.errors);
        let data = response
            .data
            .into_json()
            .expect("selected queue result should be JSON");
        let room = &data["startVoteQueueItem"];

        assert_eq!(room["isGameOver"], false);
        assert_eq!(room["currentIssueTitle"], "Selected issue");
        assert_eq!(room["voteQueue"].as_array().map(Vec::len), Some(1));
        assert_eq!(room["voteQueue"][0]["title"], "First issue");
    }

    #[tokio::test]
    async fn starting_a_queued_issue_returns_the_current_queued_issue_to_the_queue() {
        let (schema, room_id, user_id) = schema_with_room(false);
        let mut first_id = String::new();
        let mut selected_id = String::new();

        for title in ["Current issue", "Selected issue"] {
            let response = schema
                .execute(Request::new(format!(
                    "mutation {{ addVoteQueueItem(roomId: \"{room_id}\", userId: \"{user_id}\", title: \"{title}\") {{
                        voteQueue {{ id title }}
                    }} }}"
                )))
                .await;
            assert!(response.errors.is_empty(), "{:?}", response.errors);
            let data = response
                .data
                .into_json()
                .expect("queue item result should be JSON");
            let queue = data["addVoteQueueItem"]["voteQueue"]
                .as_array()
                .expect("vote queue should be an array");
            let item_id = queue
                .last()
                .and_then(|item| item["id"].as_str())
                .expect("queue item id should be a string")
                .to_string();

            if title == "Current issue" {
                first_id = item_id;
            } else {
                selected_id = item_id;
            }
        }

        for item_id in [&first_id, &selected_id] {
            let response = schema
                .execute(Request::new(format!(
                    "mutation {{ startVoteQueueItem(roomId: \"{room_id}\", userId: \"{user_id}\", itemId: \"{item_id}\") {{
                        currentIssueTitle
                        currentQueueItemId
                        voteQueue {{ id title }}
                    }} }}"
                )))
                .await;
            assert!(response.errors.is_empty(), "{:?}", response.errors);

            if item_id == &selected_id {
                let data = response
                    .data
                    .into_json()
                    .expect("selected queue result should be JSON");
                let room = &data["startVoteQueueItem"];

                assert_eq!(room["currentIssueTitle"], "Selected issue");
                assert_eq!(room["currentQueueItemId"], selected_id);
                assert_eq!(room["voteQueue"].as_array().map(Vec::len), Some(1));
                assert_eq!(room["voteQueue"][0]["id"], first_id);
                assert_eq!(room["voteQueue"][0]["title"], "Current issue");
            }
        }
    }

    #[tokio::test]
    async fn room_owner_can_return_the_current_issue_to_the_front_of_the_queue() {
        let (schema, room_id, user_id) = schema_with_room(false);
        let queued = schema
            .execute(Request::new(format!(
                "mutation {{ addVoteQueueItem(roomId: \"{room_id}\", userId: \"{user_id}\", title: \"Accidental issue\") {{
                    voteQueue {{ id }}
                }} }}"
            )))
            .await;
        assert!(queued.errors.is_empty(), "{:?}", queued.errors);
        let queued_data = queued
            .data
            .into_json()
            .expect("queue item result should be JSON");
        let item_id = queued_data["addVoteQueueItem"]["voteQueue"][0]["id"]
            .as_str()
            .expect("queue item id should be a string");

        let started = schema
            .execute(Request::new(format!(
                "mutation {{ startVoteQueueItem(roomId: \"{room_id}\", userId: \"{user_id}\", itemId: \"{item_id}\") {{
                    currentQueueItemId
                }} }}"
            )))
            .await;
        assert!(started.errors.is_empty(), "{:?}", started.errors);

        let returned = schema
            .execute(Request::new(format!(
                "mutation {{ returnCurrentVoteQueueItem(roomId: \"{room_id}\", userId: \"{user_id}\") {{
                    currentIssueTitle
                    currentQueueItemId
                    voteQueue {{ id title }}
                    game {{ table {{ card }} }}
                }} }}"
            )))
            .await;
        assert!(returned.errors.is_empty(), "{:?}", returned.errors);
        let returned_data = returned
            .data
            .into_json()
            .expect("returned queue item should be JSON");
        let room = &returned_data["returnCurrentVoteQueueItem"];

        assert_eq!(room["currentIssueTitle"], serde_json::Value::Null);
        assert_eq!(room["currentQueueItemId"], serde_json::Value::Null);
        assert_eq!(room["voteQueue"][0]["id"], item_id);
        assert_eq!(room["voteQueue"][0]["title"], "Accidental issue");
        assert_eq!(room["game"]["table"].as_array().map(Vec::len), Some(0));
    }
}
