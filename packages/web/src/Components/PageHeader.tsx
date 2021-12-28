import { ComponentProps } from "react";
import { Container } from "./Container";
import "./PageHeader.css";

export interface PageHeaderProps extends ComponentProps<"div"> {}

export function PageHeader(props: PageHeaderProps) {
  const { children } = props;

  return (
    <div className="page__header">
      <Container>{children}</Container>
    </div>
  );
}
