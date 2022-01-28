export type Subscriber<E> = (e: E) => void;

export class Channel<E> {
  last: E | undefined;
  subscribers: Subscriber<E>[] = [];

  subscribe(subscriber: Subscriber<E>) {
    this.subscribers.push(subscriber);

    if (this.last) {
      subscriber(this.last);
    }

    return () => {
      this.subscribers = this.subscribers.filter((_subscriber) => {
        return _subscriber !== subscriber;
      });
    };
  }

  broadcast(e: E, options: { persistent: boolean }) {
    if (options.persistent) {
      this.last = e;
    }

    this.subscribers.forEach((subscriber) => {
      subscriber(e);
    });
  }
}
