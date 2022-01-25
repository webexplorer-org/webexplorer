import "./Stateful.css";
import { ComponentProps } from "react";
import { Loading } from "./Loading";
import { Localized } from "@fluent/react";

export enum State {
  Initial,
  Loading,
  Failure,
  Success,
}

export interface StatefulProps extends ComponentProps<"div"> {
  state: State;
}

export function Stateful(props: StatefulProps) {
  const { state, children } = props;

  let content = null;
  switch (state) {
    case State.Initial:
      content = <Loading />;
      break;
    case State.Loading:
      content = <Loading />;
      break;
    case State.Success:
      content = children;
      break;
    case State.Failure:
      content = (
        <Localized id="loading-failure">
          <p></p>
        </Localized>
      );
      break;
  }

  return <div className="stateful">{content}</div>;
}
