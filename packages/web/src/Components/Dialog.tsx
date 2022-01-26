import "./Dialog.css";
import { ComponentProps } from "react";
import ReactDOM from "react-dom";

export interface DialogProps extends ComponentProps<"div"> {
  isVisible: boolean;
}

export function Dialog(props: DialogProps) {
  const { className, isVisible, children, ...rest } = props;

  const classes = ["dialog"];
  if (className) {
    classes.push(className);
  }

  if (isVisible) {
    classes.push("dialog--shown");
  }

  return ReactDOM.createPortal(
    <div
      aria-modal="true"
      role="dialog"
      className={classes.join(" ")}
      {...rest}
    >
      <div className="dialog__backdrop"></div>
      <div className="dialog__body">{isVisible ? children : null}</div>
    </div>,
    document.body
  );
}

type DialogHeaderProps = ComponentProps<"div">;

export function DialogHeader(props: DialogHeaderProps) {
  return <div className="dialog__header">{props.children}</div>;
}

type DialogMainProps = ComponentProps<"div">;

export function DialogMain(props: DialogMainProps) {
  return <div className="dialog__main">{props.children}</div>;
}

type DialogFooterProps = ComponentProps<"div">;

export function DialogFooter(props: DialogFooterProps) {
  return <div className="dialog__footer">{props.children}</div>;
}
