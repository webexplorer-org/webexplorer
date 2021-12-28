import { ComponentProps } from "react";
import "./Container.css";

export interface ContainerProps extends ComponentProps<"div"> {}

export function Container(props: ContainerProps) {
  return <div className="container">{props.children}</div>;
}
