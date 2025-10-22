import { FieldPolicy, FieldReadFunction, TypePolicies, TypePolicy } from '@apollo/client/cache';
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
export type MutationRootKeySpecifier = ('banUser' | 'cancelRevealCountdown' | 'createRoom' | 'createUser' | 'editUser' | 'joinRoom' | 'kickUser' | 'logout' | 'pickCard' | 'renameRoom' | 'resetGame' | 'setRoomOwner' | 'showCards' | 'startRevealCountdown' | 'toggleConfirmNewGame' | 'toggleCountdownOption' | 'unbanUser' | 'updateDeck' | MutationRootKeySpecifier)[];
export type MutationRootFieldPolicy = {
	banUser?: FieldPolicy<any> | FieldReadFunction<any>,
	cancelRevealCountdown?: FieldPolicy<any> | FieldReadFunction<any>,
	createRoom?: FieldPolicy<any> | FieldReadFunction<any>,
	createUser?: FieldPolicy<any> | FieldReadFunction<any>,
	editUser?: FieldPolicy<any> | FieldReadFunction<any>,
	joinRoom?: FieldPolicy<any> | FieldReadFunction<any>,
	kickUser?: FieldPolicy<any> | FieldReadFunction<any>,
	logout?: FieldPolicy<any> | FieldReadFunction<any>,
	pickCard?: FieldPolicy<any> | FieldReadFunction<any>,
	renameRoom?: FieldPolicy<any> | FieldReadFunction<any>,
	resetGame?: FieldPolicy<any> | FieldReadFunction<any>,
	setRoomOwner?: FieldPolicy<any> | FieldReadFunction<any>,
	showCards?: FieldPolicy<any> | FieldReadFunction<any>,
	startRevealCountdown?: FieldPolicy<any> | FieldReadFunction<any>,
	toggleConfirmNewGame?: FieldPolicy<any> | FieldReadFunction<any>,
	toggleCountdownOption?: FieldPolicy<any> | FieldReadFunction<any>,
	unbanUser?: FieldPolicy<any> | FieldReadFunction<any>,
	updateDeck?: FieldPolicy<any> | FieldReadFunction<any>
};
export type QueryRootKeySpecifier = ('roomById' | 'rooms' | 'userRooms' | QueryRootKeySpecifier)[];
export type QueryRootFieldPolicy = {
	roomById?: FieldPolicy<any> | FieldReadFunction<any>,
	rooms?: FieldPolicy<any> | FieldReadFunction<any>,
	userRooms?: FieldPolicy<any> | FieldReadFunction<any>
};
export type RoomKeySpecifier = ('bannedUsers' | 'confirmNewGame' | 'countdownEnabled' | 'countdownValue' | 'deck' | 'game' | 'id' | 'isGameOver' | 'name' | 'revealStage' | 'roomOwnerId' | 'users' | RoomKeySpecifier)[];
export type RoomFieldPolicy = {
	bannedUsers?: FieldPolicy<any> | FieldReadFunction<any>,
	confirmNewGame?: FieldPolicy<any> | FieldReadFunction<any>,
	countdownEnabled?: FieldPolicy<any> | FieldReadFunction<any>,
	countdownValue?: FieldPolicy<any> | FieldReadFunction<any>,
	deck?: FieldPolicy<any> | FieldReadFunction<any>,
	game?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	isGameOver?: FieldPolicy<any> | FieldReadFunction<any>,
	name?: FieldPolicy<any> | FieldReadFunction<any>,
	revealStage?: FieldPolicy<any> | FieldReadFunction<any>,
	roomOwnerId?: FieldPolicy<any> | FieldReadFunction<any>,
	users?: FieldPolicy<any> | FieldReadFunction<any>
};
export type SubscriptionRootKeySpecifier = ('room' | SubscriptionRootKeySpecifier)[];
export type SubscriptionRootFieldPolicy = {
	room?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UserKeySpecifier = ('id' | 'username' | UserKeySpecifier)[];
export type UserFieldPolicy = {
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	username?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UserCardKeySpecifier = ('card' | 'userId' | UserCardKeySpecifier)[];
export type UserCardFieldPolicy = {
	card?: FieldPolicy<any> | FieldReadFunction<any>,
	userId?: FieldPolicy<any> | FieldReadFunction<any>
};
export type StrictTypedTypePolicies = {
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