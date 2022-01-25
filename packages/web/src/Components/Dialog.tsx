import { ComponentProps } from "react";
import ReactDOM from "react-dom";

export interface DialogProps extends ComponentProps<"div"> {
  isVisible: boolean;
}

export function Dialog(props: DialogProps) {
  const { isVisible, children } = props;

  if (!isVisible) {
    return null;
  }

  return ReactDOM.createPortal(children, document.body);
}
