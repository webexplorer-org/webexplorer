import "./Loading.css";
import { Localized } from "@fluent/react";

export function Loading() {
  return (
    <div className="loading">
      <div className="lds-spinner">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      <Localized id="loading">
        <label>Loading</label>
      </Localized>
    </div>
  );
}
