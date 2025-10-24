use std::{collections::HashMap, sync::Arc};

use tokio::sync::Mutex;
use uuid::Uuid;

use crate::domain::room::Room;

pub type EntityId = Uuid;

pub type Card = String;

pub type Storage = Arc<Mutex<HashMap<EntityId, Room>>>;
