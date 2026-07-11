import { createClient, type Client } from "graphql-ws";
import WebSocket from "ws";

import type { Target } from "./config.js";
import type { ChatPayload, Docs, RoomEventPayload, RoomSnapshot } from "./gql.js";
import { DEFAULT_CARDS } from "./gql.js";
import { gqlPost, type TimedResult } from "./http.js";

export type SubscriptionHandler<T> = (payload: T, receivedAt: number) => void;

export interface VuOptions {
  /** Per-operation timeout; raise for capacity runs under intentional saturation */
  timeoutMs?: number;
  onDisconnect?: () => void;
}

/**
 * A protocol-level virtual user. Mirrors the real client's transport split:
 * mutations over HTTP POST, subscriptions multiplexed over one
 * graphql-transport-ws connection (same graphql-ws library the SPA uses).
 */
export class VirtualUser {
  userId = "";
  username = "";
  private client: Client | null = null;
  private readonly unsubscribers: Array<() => void> = [];
  private disposed = false;
  private readonly timeoutMs: number;

  constructor(
    private readonly target: Target,
    private readonly docs: Docs,
    private readonly opts: VuOptions = {}
  ) {
    this.timeoutMs = opts.timeoutMs ?? 5000;
  }

  /** Opens the WS connection; resolves on connection_ack. */
  async connect(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("WS connect timeout")), this.timeoutMs);
      this.client = createClient({
        url: this.target.wsUrl,
        webSocketImpl: WebSocket,
        lazy: false,
        retryAttempts: 0,
        on: {
          connected: () => {
            clearTimeout(timer);
            resolve();
          },
          error: (err) => {
            clearTimeout(timer);
            reject(err instanceof Error ? err : new Error(String(err)));
          },
          closed: () => {
            if (!this.disposed) this.opts.onDisconnect?.();
          }
        }
      });
    });
  }

  async createUser(username: string): Promise<TimedResult> {
    const res = await gqlPost<{ createUser: { id: string; username: string } }>(
      this.target.httpUrl,
      this.docs.createUser,
      { username },
      this.timeoutMs
    );
    if (res.ok && res.data) {
      this.userId = res.data.createUser.id;
      this.username = res.data.createUser.username;
    }
    return res;
  }

  async createRoom(name?: string): Promise<TimedResult & { roomId?: string }> {
    const res = await gqlPost<{ createRoom: { id: string } }>(
      this.target.httpUrl,
      this.docs.createRoom,
      { roomId: null, name: name ?? null, cards: DEFAULT_CARDS },
      this.timeoutMs
    );
    return { ...res, roomId: res.data?.createRoom.id };
  }

  async joinRoom(roomId: string): Promise<TimedResult> {
    return gqlPost(
      this.target.httpUrl,
      this.docs.joinRoom,
      { roomId, user: { id: this.userId, username: this.username }, roomOwnerId: null },
      this.timeoutMs
    );
  }

  async pickCard(roomId: string, card: string): Promise<TimedResult> {
    return gqlPost(this.target.httpUrl, this.docs.pickCard, { userId: this.userId, roomId, card }, this.timeoutMs);
  }

  async showCards(roomId: string): Promise<TimedResult> {
    return gqlPost(this.target.httpUrl, this.docs.showCards, { roomId }, this.timeoutMs);
  }

  async resetGame(roomId: string): Promise<TimedResult> {
    return gqlPost(this.target.httpUrl, this.docs.resetGame, { roomId }, this.timeoutMs);
  }

  async sendChat(roomId: string, content: string): Promise<TimedResult> {
    return gqlPost(
      this.target.httpUrl,
      this.docs.sendChat,
      { roomId, userId: this.userId, username: this.username, content },
      this.timeoutMs
    );
  }

  subscribeRoom(roomId: string, onNext: SubscriptionHandler<RoomSnapshot>): void {
    this.subscribe<{ room: RoomSnapshot }>(this.docs.roomSub, { roomId }, (data, t) => onNext(data.room, t));
  }

  subscribeChat(roomId: string, onNext: SubscriptionHandler<ChatPayload>): void {
    this.subscribe<{ roomChat: ChatPayload }>(this.docs.chatSub, { roomId }, (data, t) => onNext(data.roomChat, t));
  }

  subscribeEvents(roomId: string, onNext: SubscriptionHandler<RoomEventPayload>): void {
    this.subscribe<{ roomEvents: RoomEventPayload }>(this.docs.eventsSub, { roomId }, (data, t) =>
      onNext(data.roomEvents, t)
    );
  }

  private subscribe<T>(query: string, variables: Record<string, unknown>, onNext: SubscriptionHandler<T>): void {
    if (!this.client) throw new Error("connect() before subscribing");
    const dispose = this.client.subscribe<T>(
      { query, variables },
      {
        next: (msg) => {
          if (msg.data) onNext(msg.data, Date.now());
        },
        error: () => {
          if (!this.disposed) this.opts.onDisconnect?.();
        },
        complete: () => {}
      }
    );
    this.unsubscribers.push(dispose);
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    for (const unsub of this.unsubscribers) {
      try {
        unsub();
      } catch {
        // socket may already be gone
      }
    }
    this.unsubscribers.length = 0;
    if (this.client) {
      try {
        await this.client.dispose();
      } catch {
        // ignore teardown races
      }
      this.client = null;
    }
  }
}
