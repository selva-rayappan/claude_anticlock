import React from "react";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import { useDispatch, useSelector } from "react-redux";

import { WatchlistItem } from "@/types";
import {
  addToWatchlist,
  removeFromWatchlist,
  selectIsInWatchlist,
} from "./watchlistSlice";
import { cn } from "@/utils/helper";

interface BookmarkButtonProps {
  item: Omit<WatchlistItem, "addedAt">;
  variant?: "overlay" | "inline";
  className?: string;
}

const BookmarkButton = ({
  item,
  variant = "overlay",
  className,
}: BookmarkButtonProps) => {
  const dispatch = useDispatch();
  const isInWatchlist = useSelector((state) =>
    selectIsInWatchlist(state as any, item.id)
  );

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWatchlist) {
      dispatch(removeFromWatchlist(item.id));
    } else {
      dispatch(addToWatchlist({ ...item, addedAt: Date.now() }));
    }
  };

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
        className={cn(
          "flex items-center gap-2 sm:text-base xs:text-[14.75px] text-[13.75px] xs:py-2 py-[6px] sm:px-6 xs:px-5 px-[18px] hover:-translate-y-[2px] transition-all duration-300 active:translate-y-[1px] rounded-full font-medium border",
          isInWatchlist
            ? "border-[#ff0000] text-[#ff0000]"
            : "border-gray-400 text-gray-300 hover:border-[#ff0000] hover:text-[#ff0000]",
          className
        )}
      >
        {isInWatchlist ? <BsBookmarkFill /> : <BsBookmark />}
        <span>{isInWatchlist ? "Saved" : "Watchlist"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
      className={cn(
        "absolute top-2 right-2 z-10 text-[18px] p-1 rounded transition-all duration-200 hover:scale-110",
        isInWatchlist ? "text-[#ff0000]" : "text-gray-300 hover:text-[#ff0000]",
        className
      )}
    >
      {isInWatchlist ? <BsBookmarkFill /> : <BsBookmark />}
    </button>
  );
};

export default BookmarkButton;
