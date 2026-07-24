import { FieldPolicy, FieldReadFunction, TypePolicies, TypePolicy } from '@apollo/client/cache';
export type ArchivedPlayerVoteKeySpecifier = ('card' | 'userId' | 'username' | 'value' | ArchivedPlayerVoteKeySpecifier)[];
export type ArchivedPlayerVoteFieldPolicy = {
	card?: FieldPolicy<any> | FieldReadFunction<any>,
	userId?: FieldPolicy<any> | FieldReadFunction<any>,
	username?: FieldPolicy<any> | FieldReadFunction<any>,
	value?: FieldPolicy<any> | FieldReadFunction<any>
};
export type ChatMessageKeySpecifier = ('content' | 'contentType' | 'formattedContent' | 'id' | 'position' | 'roomId' | 'timestamp' | 'userId' | 'username' | ChatMessageKeySpecifier)[];
export type ChatMessageFieldPolicy = {
	content?: FieldPolicy<any> | FieldReadFunction<any>,
	contentType?: FieldPolicy<any> | FieldReadFunction<any>,
	formattedContent?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	position?: FieldPolicy<any> | FieldReadFunction<any>,
	roomId?: FieldPolicy<any> | FieldReadFunction<any>,
	timestamp?: FieldPolicy<any> | FieldReadFunction<any>,
	userId?: FieldPolicy<any> | FieldReadFunction<any>,
	username?: FieldPolicy<any> | FieldReadFunction<any>
};
export type ChatPositionKeySpecifier = ('height' | 'width' | 'x' | 'y' | ChatPositionKeySpecifier)[];
export type ChatPositionFieldPolicy = {
	height?: FieldPolicy<any> | FieldReadFunction<any>,
	width?: FieldPolicy<any> | FieldReadFunction<any>,
	x?: FieldPolicy<any> | FieldReadFunction<any>,
	y?: FieldPolicy<any> | FieldReadFunction<any>
};
export type DeckKeySpecifier = ('cards' | 'id' | DeckKeySpecifier)[];
export type DeckFieldPolicy = {
	cards?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>
};
export type GameKeySpecifier = ('id' | 'table' | GameKeySpecifier)[];
export type GameFieldPolicy = {
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	table?: FieldPolicy<any> | FieldReadFunction<any>
};
export type MutationRootKeySpecifier = ('banUser' | 'cancelRevealCountdown' | 'createRoom' | 'createUser' | 'editUser' | 'joinRoom' | 'kickUser' | 'leaveRoom' | 'logout' | 'markChatSeen' | 'pickCard' | 'renameRoom' | 'resetGame' | 'sendChatMessage' | 'sendReaction' | 'setRoomOwner' | 'setVoteUncensored' | 'showCards' | 'startRevealCountdown' | 'startRevote' | 'toggleCensorVotes' | 'toggleConfirmNewGame' | 'toggleCountdownOption' | 'toggleLockVotes' | 'toggleShowVoteChanges' | 'unbanUser' | 'updateDeck' | MutationRootKeySpecifier)[];
export type MutationRootFieldPolicy = {
	banUser?: FieldPolicy<any> | FieldReadFunction<any>,
	cancelRevealCountdown?: FieldPolicy<any> | FieldReadFunction<any>,
	createRoom?: FieldPolicy<any> | FieldReadFunction<any>,
	createUser?: FieldPolicy<any> | FieldReadFunction<any>,
	editUser?: FieldPolicy<any> | FieldReadFunction<any>,
	joinRoom?: FieldPolicy<any> | FieldReadFunction<any>,
	kickUser?: FieldPolicy<any> | FieldReadFunction<any>,
	leaveRoom?: FieldPolicy<any> | FieldReadFunction<any>,
	logout?: FieldPolicy<any> | FieldReadFunction<any>,
	markChatSeen?: FieldPolicy<any> | FieldReadFunction<any>,
	pickCard?: FieldPolicy<any> | FieldReadFunction<any>,
	renameRoom?: FieldPolicy<any> | FieldReadFunction<any>,
	resetGame?: FieldPolicy<any> | FieldReadFunction<any>,
	sendChatMessage?: FieldPolicy<any> | FieldReadFunction<any>,
	sendReaction?: FieldPolicy<any> | FieldReadFunction<any>,
	setRoomOwner?: FieldPolicy<any> | FieldReadFunction<any>,
	setVoteUncensored?: FieldPolicy<any> | FieldReadFunction<any>,
	showCards?: FieldPolicy<any> | FieldReadFunction<any>,
	startRevealCountdown?: FieldPolicy<any> | FieldReadFunction<any>,
	startRevote?: FieldPolicy<any> | FieldReadFunction<any>,
	toggleCensorVotes?: FieldPolicy<any> | FieldReadFunction<any>,
	toggleConfirmNewGame?: FieldPolicy<any> | FieldReadFunction<any>,
	toggleCountdownOption?: FieldPolicy<any> | FieldReadFunction<any>,
	toggleLockVotes?: FieldPolicy<any> | FieldReadFunction<any>,
	toggleShowVoteChanges?: FieldPolicy<any> | FieldReadFunction<any>,
	unbanUser?: FieldPolicy<any> | FieldReadFunction<any>,
	updateDeck?: FieldPolicy<any> | FieldReadFunction<any>
};
export type QueryRootKeySpecifier = ('roomById' | 'rooms' | 'userRooms' | QueryRootKeySpecifier)[];
export type QueryRootFieldPolicy = {
	roomById?: FieldPolicy<any> | FieldReadFunction<any>,
	rooms?: FieldPolicy<any> | FieldReadFunction<any>,
	userRooms?: FieldPolicy<any> | FieldReadFunction<any>
};
export type RoomKeySpecifier = ('bannedUsers' | 'censorVotes' | 'chatHistory' | 'confirmNewGame' | 'countdownEnabled' | 'countdownValue' | 'deck' | 'game' | 'hasUnreadChat' | 'id' | 'isGameOver' | 'lockVotes' | 'name' | 'previousRound' | 'revealStage' | 'roomOwnerId' | 'showVoteChanges' | 'users' | RoomKeySpecifier)[];
export type RoomFieldPolicy = {
	bannedUsers?: FieldPolicy<any> | FieldReadFunction<any>,
	censorVotes?: FieldPolicy<any> | FieldReadFunction<any>,
	chatHistory?: FieldPolicy<any> | FieldReadFunction<any>,
	confirmNewGame?: FieldPolicy<any> | FieldReadFunction<any>,
	countdownEnabled?: FieldPolicy<any> | FieldReadFunction<any>,
	countdownValue?: FieldPolicy<any> | FieldReadFunction<any>,
	deck?: FieldPolicy<any> | FieldReadFunction<any>,
	game?: FieldPolicy<any> | FieldReadFunction<any>,
	hasUnreadChat?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	isGameOver?: FieldPolicy<any> | FieldReadFunction<any>,
	lockVotes?: FieldPolicy<any> | FieldReadFunction<any>,
	name?: FieldPolicy<any> | FieldReadFunction<any>,
	previousRound?: FieldPolicy<any> | FieldReadFunction<any>,
	revealStage?: FieldPolicy<any> | FieldReadFunction<any>,
	roomOwnerId?: FieldPolicy<any> | FieldReadFunction<any>,
	showVoteChanges?: FieldPolicy<any> | FieldReadFunction<any>,
	users?: FieldPolicy<any> | FieldReadFunction<any>
};
export type RoomEventKeySpecifier = ('eventType' | 'room' | 'roomId' | 'targetUserId' | RoomEventKeySpecifier)[];
export type RoomEventFieldPolicy = {
	eventType?: FieldPolicy<any> | FieldReadFunction<any>,
	room?: FieldPolicy<any> | FieldReadFunction<any>,
	roomId?: FieldPolicy<any> | FieldReadFunction<any>,
	targetUserId?: FieldPolicy<any> | FieldReadFunction<any>
};
export type RoomReactionKeySpecifier = ('id' | 'reaction' | 'roomId' | 'userId' | RoomReactionKeySpecifier)[];
export type RoomReactionFieldPolicy = {
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	reaction?: FieldPolicy<any> | FieldReadFunction<any>,
	roomId?: FieldPolicy<any> | FieldReadFunction<any>,
	userId?: FieldPolicy<any> | FieldReadFunction<any>
};
export type RoundVoteHistoryKeySpecifier = ('completedAt' | 'id' | 'roundNumber' | 'votes' | RoundVoteHistoryKeySpecifier)[];
export type RoundVoteHistoryFieldPolicy = {
	completedAt?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	roundNumber?: FieldPolicy<any> | FieldReadFunction<any>,
	votes?: FieldPolicy<any> | FieldReadFunction<any>
};
export type SubscriptionRootKeySpecifier = ('room' | 'roomChat' | 'roomEvents' | 'roomReactions' | SubscriptionRootKeySpecifier)[];
export type SubscriptionRootFieldPolicy = {
	room?: FieldPolicy<any> | FieldReadFunction<any>,
	roomChat?: FieldPolicy<any> | FieldReadFunction<any>,
	roomEvents?: FieldPolicy<any> | FieldReadFunction<any>,
	roomReactions?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UserKeySpecifier = ('handRaised' | 'id' | 'lastCardPicked' | 'lastCardValue' | 'lastSeenChatMessageId' | 'previousCardPicked' | 'previousCardValue' | 'username' | 'voteUncensored' | UserKeySpecifier)[];
export type UserFieldPolicy = {
	handRaised?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	lastCardPicked?: FieldPolicy<any> | FieldReadFunction<any>,
	lastCardValue?: FieldPolicy<any> | FieldReadFunction<any>,
	lastSeenChatMessageId?: FieldPolicy<any> | FieldReadFunction<any>,
	previousCardPicked?: FieldPolicy<any> | FieldReadFunction<any>,
	previousCardValue?: FieldPolicy<any> | FieldReadFunction<any>,
	username?: FieldPolicy<any> | FieldReadFunction<any>,
	voteUncensored?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UserCardKeySpecifier = ('card' | 'userId' | UserCardKeySpecifier)[];
export type UserCardFieldPolicy = {
	card?: FieldPolicy<any> | FieldReadFunction<any>,
	userId?: FieldPolicy<any> | FieldReadFunction<any>
};
export type StrictTypedTypePolicies = {
	ArchivedPlayerVote?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | ArchivedPlayerVoteKeySpecifier | (() => undefined | ArchivedPlayerVoteKeySpecifier),
		fields?: ArchivedPlayerVoteFieldPolicy,
	},
	ChatMessage?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | ChatMessageKeySpecifier | (() => undefined | ChatMessageKeySpecifier),
		fields?: ChatMessageFieldPolicy,
	},
	ChatPosition?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | ChatPositionKeySpecifier | (() => undefined | ChatPositionKeySpecifier),
		fields?: ChatPositionFieldPolicy,
	},
	Deck?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | DeckKeySpecifier | (() => undefined | DeckKeySpecifier),
		fields?: DeckFieldPolicy,
	},
	Game?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | GameKeySpecifier | (() => undefined | GameKeySpecifier),
		fields?: GameFieldPolicy,
	},
	MutationRoot?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | MutationRootKeySpecifier | (() => undefined | MutationRootKeySpecifier),
		fields?: MutationRootFieldPolicy,
	},
	QueryRoot?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | QueryRootKeySpecifier | (() => undefined | QueryRootKeySpecifier),
		fields?: QueryRootFieldPolicy,
	},
	Room?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | RoomKeySpecifier | (() => undefined | RoomKeySpecifier),
		fields?: RoomFieldPolicy,
	},
	RoomEvent?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | RoomEventKeySpecifier | (() => undefined | RoomEventKeySpecifier),
		fields?: RoomEventFieldPolicy,
	},
	RoomReaction?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | RoomReactionKeySpecifier | (() => undefined | RoomReactionKeySpecifier),
		fields?: RoomReactionFieldPolicy,
	},
	RoundVoteHistory?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | RoundVoteHistoryKeySpecifier | (() => undefined | RoundVoteHistoryKeySpecifier),
		fields?: RoundVoteHistoryFieldPolicy,
	},
	SubscriptionRoot?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | SubscriptionRootKeySpecifier | (() => undefined | SubscriptionRootKeySpecifier),
		fields?: SubscriptionRootFieldPolicy,
	},
	User?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UserKeySpecifier | (() => undefined | UserKeySpecifier),
		fields?: UserFieldPolicy,
	},
	UserCard?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UserCardKeySpecifier | (() => undefined | UserCardKeySpecifier),
		fields?: UserCardFieldPolicy,
	}
};
export type TypedTypePolicies = StrictTypedTypePolicies & TypePolicies;