import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WatchlistItem } from "@/types";

interface WatchlistState {
  items: WatchlistItem[];
}

const initialState: WatchlistState = { items: [] };

const watchlistSlice = createSlice({
  name: "watchlist",
  initialState,
  reducers: {
    addToWatchlist(state, action: PayloadAction<WatchlistItem>) {
      const exists = state.items.some((item) => item.id === action.payload.id);
      if (!exists) {
        state.items.unshift(action.payload);
      }
    },
    removeFromWatchlist(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
  },
});

export const { addToWatchlist, removeFromWatchlist } = watchlistSlice.actions;

interface RootLike {
  watchlist: WatchlistState;
}

export const selectWatchlistItems = (state: RootLike) => state.watchlist.items;
export const selectWatchlistCount = (state: RootLike) => state.watchlist.items.length;
export const selectIsInWatchlist = (state: RootLike, id: string) =>
  state.watchlist.items.some((item) => item.id === id);

export default watchlistSlice.reducer;
