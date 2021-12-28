import { ComponentProps } from "react";
import "./Page.css";

export interface PageProps extends ComponentProps<"div"> {}

export function Page(props: PageProps) {
  const { children } = props;

  return <div className="page">{children}</div>;
}
