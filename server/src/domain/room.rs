use async_graphql::SimpleObject;
use chrono::{DateTime, Duration, Utc};
use std::collections::HashMap;
use std::time::Instant;
use uuid::Uuid;

use crate::types::{Card, EntityId};

use super::{
    deck::Deck,
    game::{Game, UserCard},
    user::User,
};

#[derive(Clone, Debug, PartialEq, SimpleObject)]
pub struct VoteQueueItem {
    pub id: EntityId,
    pub title: String,
}

#[derive(Clone, Debug, PartialEq, SimpleObject)]
pub struct ArchivedVoteSelection {
    pub card: Card,
    pub value: Option<f32>,
    pub phase: i32,
}

#[derive(Clone, Debug, PartialEq, SimpleObject)]
pub struct ArchivedPlayerVote {
    pub user_id: EntityId,
    pub username: String,
    pub card: Option<Card>,
    pub value: Option<f32>,
    pub selections: Vec<ArchivedVoteSelection>,
}

#[derive(Clone, Debug, PartialEq, SimpleObject)]
pub struct RoundVoteHistory {
    pub id: EntityId,
    pub round_number: i32,
    pub revote_count: i32,
    pub completed_at: DateTime<Utc>,
    pub issue_title: Option<String>,
    pub votes: Vec<ArchivedPlayerVote>,
}

#[derive(Clone, Debug, SimpleObject)]
#[graphql(complex)]
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
    pub show_vote_changes: bool,
    pub censor_votes: bool,
    pub lock_votes: bool,
    pub previous_round: Option<RoundVoteHistory>,
    pub current_issue_title: Option<String>,
    pub current_queue_item_id: Option<EntityId>,
    pub vote_queue: Vec<VoteQueueItem>,
    pub vote_history: Vec<RoundVoteHistory>,
    pub chat_history: Vec<crate::domain::chat::ChatMessage>,

    #[graphql(skip)]
    pub last_active: DateTime<Utc>,

    #[graphql(skip)]
    pub last_active_instant: Instant,

    #[graphql(skip)]
    pub current_vote_selections: HashMap<EntityId, Vec<Card>>,
}

impl Room {
    pub fn new_with_id(id: Option<Uuid>, name: Option<String>, cards: Vec<Card>) -> Self {
        Room {
            id: id.unwrap_or_else(Uuid::new_v4),
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
            show_vote_changes: true,
            censor_votes: false,
            lock_votes: false,
            previous_round: None,
            current_issue_title: None,
            current_queue_item_id: None,
            vote_queue: Vec::new(),
            vote_history: Vec::new(),
            last_active: Utc::now(),
            last_active_instant: Instant::now(),
            chat_history: Vec::new(),
            current_vote_selections: HashMap::new(),
        }
    }

    #[allow(dead_code)]
    pub fn new(name: Option<String>, cards: Vec<Card>) -> Self {
        Self::new_with_id(None, name, cards)
    }

    /// Return a Room snapshot suitable for publishing to clients.
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

    pub fn remove_user(&mut self, user_id: EntityId) {
        self.users.retain(|user| user.id != user_id);
        self.game.table.retain(|uc| uc.user_id != user_id);
        self.current_vote_selections.remove(&user_id);

        if self.room_owner_id == Some(user_id) {
            self.room_owner_id = self.users.first().map(|user| user.id);
        }
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

    pub fn reveal_cards(&mut self) {
        if !self.is_game_over {
            for user in &mut self.users {
                user.previous_card_picked = user.last_card_picked.clone();
                user.previous_card_value = user.last_card_value;
            }
        }

        self.is_game_over = true;
    }

    pub fn record_vote_selection(&mut self, user_id: EntityId, card: &str) {
        if card.trim().is_empty() {
            return;
        }

        let selections = self.current_vote_selections.entry(user_id).or_default();
        if selections.last().is_none_or(|last| last != card) {
            selections.push(card.to_string());
        }
    }

    fn snapshot_revealed_round(&self) -> Option<RoundVoteHistory> {
        if !self.is_game_over {
            return None;
        }

        let votes = self
            .users
            .iter()
            .map(|user| ArchivedPlayerVote {
                user_id: user.id,
                username: user.username.clone(),
                card: user.last_card_picked.clone(),
                value: user.last_card_value,
                selections: self
                    .current_vote_selections
                    .get(&user.id)
                    .cloned()
                    .unwrap_or_default()
                    .into_iter()
                    .map(|card| ArchivedVoteSelection {
                        value: crate::domain::user::parse_card_to_number(&card),
                        card,
                        phase: 0,
                    })
                    .collect(),
            })
            .collect();

        let round = RoundVoteHistory {
            id: Uuid::new_v4(),
            round_number: (self.vote_history.len() + 1) as i32,
            revote_count: 0,
            completed_at: Utc::now(),
            issue_title: self.current_issue_title.clone(),
            votes,
        };

        Some(round)
    }

    fn merge_revote_rounds(
        previous_round: RoundVoteHistory,
        current_round: RoundVoteHistory,
    ) -> RoundVoteHistory {
        let revote_phase = previous_round.revote_count + 1;
        let previous_votes: HashMap<EntityId, ArchivedPlayerVote> = previous_round
            .votes
            .into_iter()
            .map(|vote| (vote.user_id, vote))
            .collect();

        let votes = current_round
            .votes
            .into_iter()
            .map(|mut current_vote| {
                let Some(previous_vote) = previous_votes.get(&current_vote.user_id) else {
                    return current_vote;
                };

                let mut selections = if previous_vote.selections.is_empty() {
                    vec![ArchivedVoteSelection {
                        card: previous_vote
                            .card
                            .clone()
                            .unwrap_or_else(|| "—".to_string()),
                        value: previous_vote.value,
                        phase: previous_round.revote_count,
                    }]
                } else {
                    previous_vote.selections.clone()
                };

                let current_selections = if current_vote.selections.is_empty() {
                    vec![ArchivedVoteSelection {
                        card: current_vote.card.clone().unwrap_or_else(|| "—".to_string()),
                        value: current_vote.value,
                        phase: revote_phase,
                    }]
                } else {
                    current_vote
                        .selections
                        .iter()
                        .cloned()
                        .map(|mut selection| {
                            selection.phase = revote_phase;
                            selection
                        })
                        .collect()
                };

                for selection in current_selections {
                    if selections.last().is_none_or(|last| {
                        last.card != selection.card || last.phase != selection.phase
                    }) {
                        selections.push(selection);
                    }
                }

                current_vote.selections = selections;
                current_vote
            })
            .collect();

        RoundVoteHistory {
            id: previous_round.id,
            round_number: previous_round.round_number,
            revote_count: revote_phase,
            completed_at: current_round.completed_at,
            issue_title: current_round.issue_title,
            votes,
        }
    }

    pub fn archive_revealed_round(&mut self) -> Option<RoundVoteHistory> {
        let current_round = self.snapshot_revealed_round()?;
        let round = match self.previous_round.take() {
            Some(previous_round) => Self::merge_revote_rounds(previous_round, current_round),
            None => current_round,
        };

        if let Some(index) = self
            .vote_history
            .iter()
            .position(|archived| archived.id == round.id)
        {
            self.vote_history[index] = round.clone();
        } else {
            self.vote_history.push(round.clone());
        }

        Some(round)
    }

    pub fn start_new_round(&mut self) {
        self.archive_revealed_round();
        self.reset_round(None);
        self.current_issue_title = None;
        self.current_queue_item_id = None;
    }

    pub fn start_revote_round(&mut self) -> bool {
        let Some(current_round) = self.snapshot_revealed_round() else {
            return false;
        };

        let previous_round = match self.previous_round.take() {
            Some(previous_round) => Self::merge_revote_rounds(previous_round, current_round),
            None => current_round,
        };
        self.vote_history
            .retain(|archived| archived.id != previous_round.id);
        self.reset_round(Some(previous_round));
        true
    }

    fn reset_round(&mut self, previous_round: Option<RoundVoteHistory>) {
        self.is_game_over = false;
        self.game = Game::new();
        self.previous_round = previous_round;
        self.current_vote_selections.clear();
        self.reveal_stage = Some("idle".to_string());
        self.countdown_value = None;

        for user in &mut self.users {
            user.last_card_picked = None;
            user.last_card_value = None;
            user.previous_card_picked = None;
            user.previous_card_value = None;
            user.hand_raised = false;
            user.vote_uncensored = false;
        }
    }

    pub fn complete_countdown(&mut self) {
        self.reveal_stage = Some("revealed".to_string());
        self.countdown_value = None;
        self.reveal_cards();
    }

    pub fn cancel_countdown(&mut self) {
        self.reveal_stage = Some("cancelled".to_string());
        self.countdown_value = None;
    }

    pub fn toggle_confirm_new_game(&mut self, enabled: bool) {
        self.confirm_new_game = enabled;
    }

    pub fn toggle_show_vote_changes(&mut self, enabled: bool) {
        self.show_vote_changes = enabled;
    }

    pub fn toggle_censor_votes(&mut self, enabled: bool) {
        self.censor_votes = enabled;
        if enabled {
            for user in &mut self.users {
                user.vote_uncensored = false;
            }
        }
    }

    pub fn toggle_lock_votes(&mut self, enabled: bool) {
        self.lock_votes = enabled;
    }

    pub fn add_vote_queue_item(&mut self, title: String) -> VoteQueueItem {
        let item = VoteQueueItem {
            id: Uuid::new_v4(),
            title,
        };
        self.vote_queue.push(item.clone());
        item
    }

    pub fn rename_vote_queue_item(&mut self, item_id: EntityId, title: String) -> bool {
        let Some(item) = self.vote_queue.iter_mut().find(|item| item.id == item_id) else {
            return false;
        };
        item.title = title;
        true
    }

    pub fn remove_vote_queue_item(&mut self, item_id: EntityId) -> bool {
        let before = self.vote_queue.len();
        self.vote_queue.retain(|item| item.id != item_id);
        self.vote_queue.len() != before
    }

    pub fn reorder_vote_queue_item(&mut self, item_id: EntityId, to_index: usize) -> bool {
        let Some(from_index) = self.vote_queue.iter().position(|item| item.id == item_id) else {
            return false;
        };
        let item = self.vote_queue.remove(from_index);
        let target = to_index.min(self.vote_queue.len());
        self.vote_queue.insert(target, item);
        true
    }

    pub fn set_current_issue_title(&mut self, title: Option<String>) {
        self.current_issue_title = title;
    }

    pub fn start_next_queue_item(&mut self) -> bool {
        if self.vote_queue.is_empty() {
            return false;
        }

        self.archive_revealed_round();
        let item = self.vote_queue.remove(0);
        self.reset_round(None);
        self.current_issue_title = Some(item.title);
        self.current_queue_item_id = Some(item.id);
        true
    }

    pub fn start_vote_queue_item(&mut self, item_id: EntityId) -> bool {
        let Some(index) = self.vote_queue.iter().position(|item| item.id == item_id) else {
            return false;
        };

        if let Some(previous_round) = self.previous_round.take() {
            if let Some(history_index) = self
                .vote_history
                .iter()
                .position(|archived| archived.id == previous_round.id)
            {
                self.vote_history[history_index] = previous_round;
            } else {
                self.vote_history.push(previous_round);
            }
        }

        let item = self.vote_queue.remove(index);
        self.reset_round(None);
        self.current_issue_title = Some(item.title);
        self.current_queue_item_id = Some(item.id);
        true
    }

    pub fn return_current_queue_item(&mut self) -> bool {
        let (Some(id), Some(title)) =
            (self.current_queue_item_id, self.current_issue_title.clone())
        else {
            return false;
        };

        if self.vote_queue.iter().any(|item| item.id == id) {
            return false;
        }

        self.current_queue_item_id = None;
        self.current_issue_title = None;
        self.vote_queue.insert(0, VoteQueueItem { id, title });
        self.reset_round(None);
        true
    }

    // === Activity / cleanup helpers ===
    pub fn touch(&mut self) {
        self.last_active = Utc::now();
        self.last_active_instant = Instant::now();
    }

    pub fn is_safe_to_remove(&self) -> bool {
        self.reveal_stage.as_deref() != Some("countdown")
    }

    pub fn is_inactive(&self, ttl: std::time::Duration) -> bool {
        self.last_active_instant.elapsed() > ttl
    }

    // === Chat functions ===
    pub fn push_chat(&mut self, msg: crate::domain::chat::ChatMessage) {
        self.chat_history.push(msg);
        if self.chat_history.len() > 100 {
            self.chat_history.drain(0..self.chat_history.len() - 100);
        }
    }

    pub fn prune_chat_history(&mut self, max_age: Duration) -> usize {
        let now = Utc::now();
        let before = self.chat_history.len();
        self.chat_history
            .retain(|msg| (now - msg.timestamp) < max_age);
        before - self.chat_history.len()
    }

    pub fn has_unread_chat_internal(&self, user_id: EntityId) -> bool {
        let user = match self.users.iter().find(|u| u.id == user_id) {
            Some(u) => u,
            None => return false,
        };

        let latest_message = match self.chat_history.last() {
            Some(msg) => msg,
            None => return false,
        };

        match user.last_seen_chat_message_id {
            Some(seen_id) => seen_id != latest_message.id,
            None => true,
        }
    }

    pub fn mark_chat_seen(&mut self, user_id: EntityId) {
        let latest_id = match self.chat_history.last() {
            Some(msg) => msg.id,
            None => return,
        };

        if let Some(user) = self.users.iter_mut().find(|u| u.id == user_id) {
            user.last_seen_chat_message_id = Some(latest_id);
        }
    }
}

#[async_graphql::ComplexObject]
impl Room {
    async fn has_unread_chat(&self, user_id: EntityId) -> Option<bool> {
        Some(self.has_unread_chat_internal(user_id))
    }
}
