import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

import { Channel } from "./Utils/channel";

test("renders learn react link", () => {
  render(<App channel={new Channel()} />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
