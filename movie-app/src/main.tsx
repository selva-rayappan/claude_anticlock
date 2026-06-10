import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LazyMotion, domAnimation } from "framer-motion";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { store, persistor } from "@/store";
import GlobalContextProvider from "@/context/globalContext";
import ThemeProvider from "@/context/themeContext";
import { Loader } from "@/common";
import App from "./App";
import "./index.css";

import "react-loading-skeleton/dist/skeleton.css";
import "swiper/css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <PersistGate loading={<Loader />} persistor={persistor}>
          <ThemeProvider>
            <GlobalContextProvider>
              <LazyMotion features={domAnimation}>
                <App />
              </LazyMotion>
            </GlobalContextProvider>
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>
);
