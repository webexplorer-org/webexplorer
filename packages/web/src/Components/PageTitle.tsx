import { ComponentProps } from "react";
import "./PageTitle.css";

export interface PageTitleProps extends ComponentProps<"h4"> {
  title: string;
}

export function PageTitle(props: PageTitleProps) {
  const { title } = props;
  return <h4 className="page__title">{title}</h4>;
}
