use std::collections::HashMap;
use tokio::time::{Duration, sleep};

use crate::{
    domain::{
        chat::{ChatMessage, ChatPosition, ChatPositionInput},
        game::{Game, UserCard},
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

        let (
            last_card_picked,
            last_card_value,
            previous_card_picked,
            previous_card_value,
            last_seen_chat_message_id,
            hand_raised,
        ) = storage
            .values()
            .find_map(|room| {
                room.users.iter().find(|u| u.id == user_id).map(|u| {
                    (
                        u.last_card_picked.clone(),
                        u.last_card_value,
                        u.previous_card_picked.clone(),
                        u.previous_card_value,
                        u.last_seen_chat_message_id,
                        u.hand_raised,
                    )
                })
            })
            .unwrap_or((None, None, None, None, None, false));

        Ok(User {
            id: user_id,
            username,
            last_card_picked,
            last_card_value,
            previous_card_picked,
            previous_card_value,
            last_seen_chat_message_id,
            hand_raised,
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

    async fn reset_game(&self, ctx: &Context<'_>, room_id: EntityId) -> Result<Room> {
        let mut storage = get_storage(ctx).await;

        match storage.get_mut(&room_id) {
            Some(room) => {
                room.is_game_over = false;
                room.game = Game::new();

                for u in room.users.iter_mut() {
                    u.last_card_picked = None;
                    u.last_card_value = None;
                    u.previous_card_picked = None;
                    u.previous_card_value = None;
                    u.hand_raised = false;
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
mod reaction_tests {
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
        room.is_game_over = is_game_over;

        let storage: Storage = Arc::new(Mutex::new(HashMap::from([(room_id, room)])));
        let schema = Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)
            .data(storage)
            .finish();

        (schema, room_id, user_id)
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
    async fn revealed_round_reactions_return_a_room_scoped_event() {
        let (schema, room_id, user_id) = schema_with_room(true);
        let response = schema
            .execute(Request::new(format!(
                "mutation {{ sendReaction(roomId: \"{room_id}\", userId: \"{user_id}\", reaction: CONFUSED) {{ roomId userId reaction }} }}"
            )))
            .await;

        assert!(response.errors.is_empty(), "{:?}", response.errors);
        let data = response
            .data
            .into_json()
            .expect("reaction data should be JSON");
        assert_eq!(data["sendReaction"]["roomId"], room_id.to_string());
        assert_eq!(data["sendReaction"]["userId"], user_id.to_string());
        assert_eq!(data["sendReaction"]["reaction"], "CONFUSED");
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
}
