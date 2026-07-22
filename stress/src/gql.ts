/**
 * GraphQL documents used by virtual users.
 *
 * Lean docs keep selection sets minimal so wire size and JSON parsing don't
 * dominate measured latency (the client's real RoomFragment includes full
 * chatHistory, making every room snapshot O(chat length)). Full-payload docs
 * mirror the real client's fragments for realistic-bandwidth runs
 * (--full-payload); which mode ran is recorded in reports and baselines.
 */

export interface Docs {
  createUser: string;
  createRoom: string;
  joinRoom: string;
  pickCard: string;
  showCards: string;
  resetGame: string;
  sendChat: string;
  roomSub: string;
  chatSub: string;
  eventsSub: string;
}

/** Matches the client's default deck (client/src/components/CreateUserDialog). */
export const DEFAULT_CARDS = ["0", "0.5", "1", "2", "3", "5", "8", "13", "21", "?", "☕"];

const LEAN: Docs = {
  createUser: `mutation($username: String!) {
    createUser(username: $username) { id username }
  }`,
  createRoom: `mutation($roomId: UUID, $name: String, $cards: [String!]!) {
    createRoom(roomId: $roomId, name: $name, cards: $cards) { id }
  }`,
  joinRoom: `mutation($roomId: UUID!, $user: UserInput!, $roomOwnerId: UUID) {
    joinRoom(roomId: $roomId, user: $user, roomOwnerId: $roomOwnerId) { id }
  }`,
  pickCard: `mutation($userId: UUID!, $roomId: UUID!, $card: String!) {
    pickCard(userId: $userId, roomId: $roomId, card: $card) { id }
  }`,
  showCards: `mutation($roomId: UUID!) {
    showCards(roomId: $roomId) { id }
  }`,
  resetGame: `mutation($roomId: UUID!) {
    resetGame(roomId: $roomId) { id }
  }`,
  sendChat: `mutation($roomId: UUID!, $userId: UUID!, $username: String!, $content: String!) {
    sendChatMessage(input: {
      roomId: $roomId, userId: $userId, username: $username,
      content: $content, contentType: "text"
    }) { id }
  }`,
  roomSub: `subscription($roomId: UUID!) {
    room(roomId: $roomId) {
      id
      isGameOver
      users { id lastCardPicked }
    }
  }`,
  chatSub: `subscription($roomId: UUID!) {
    roomChat(roomId: $roomId) { id content }
  }`,
  eventsSub: `subscription($roomId: UUID!) {
    roomEvents(roomId: $roomId) { roomId eventType targetUserId }
  }`
};

// Mirrors client/src/api/operations.graphql fragments (inlined).
const FULL_ROOM_SELECTION = `{
  id
  name
  isGameOver
  roomOwnerId
  users { id username lastCardPicked lastCardValue lastSeenChatMessageId }
  bannedUsers
  deck { id cards }
  game { id table { userId card } }
  countdownEnabled
  revealStage
  countdownValue
  confirmNewGame
  chatHistory {
    id roomId userId username content formattedContent contentType timestamp
    position { x y width height }
  }
}`;

const FULL_CHAT_SELECTION = `{
  id roomId userId username content formattedContent contentType timestamp
  position { x y width height }
}`;

const FULL: Docs = {
  ...LEAN,
  createRoom: `mutation($roomId: UUID, $name: String, $cards: [String!]!) {
    createRoom(roomId: $roomId, name: $name, cards: $cards) ${FULL_ROOM_SELECTION}
  }`,
  joinRoom: `mutation($roomId: UUID!, $user: UserInput!, $roomOwnerId: UUID) {
    joinRoom(roomId: $roomId, user: $user, roomOwnerId: $roomOwnerId) ${FULL_ROOM_SELECTION}
  }`,
  pickCard: `mutation($userId: UUID!, $roomId: UUID!, $card: String!) {
    pickCard(userId: $userId, roomId: $roomId, card: $card) ${FULL_ROOM_SELECTION}
  }`,
  showCards: `mutation($roomId: UUID!) {
    showCards(roomId: $roomId) ${FULL_ROOM_SELECTION}
  }`,
  resetGame: `mutation($roomId: UUID!) {
    resetGame(roomId: $roomId) ${FULL_ROOM_SELECTION}
  }`,
  sendChat: `mutation($roomId: UUID!, $userId: UUID!, $username: String!, $content: String!) {
    sendChatMessage(input: {
      roomId: $roomId, userId: $userId, username: $username,
      content: $content, contentType: "text"
    }) ${FULL_CHAT_SELECTION}
  }`,
  roomSub: `subscription($roomId: UUID!) {
    room(roomId: $roomId) ${FULL_ROOM_SELECTION}
  }`,
  chatSub: `subscription($roomId: UUID!) {
    roomChat(roomId: $roomId) ${FULL_CHAT_SELECTION}
  }`,
  eventsSub: `subscription($roomId: UUID!) {
    roomEvents(roomId: $roomId) { roomId eventType targetUserId room ${FULL_ROOM_SELECTION} }
  }`
};

export function getDocs(fullPayload: boolean): Docs {
  return fullPayload ? FULL : LEAN;
}

// Payload shapes the scenarios rely on (lean selections; full is a superset).
export interface RoomSnapshot {
  id: string;
  isGameOver: boolean;
  users: Array<{ id: string; lastCardPicked: string | null }>;
}
export interface ChatPayload {
  id: string;
  content: string;
}
export interface RoomEventPayload {
  roomId: string;
  eventType: string;
  targetUserId: string | null;
}
