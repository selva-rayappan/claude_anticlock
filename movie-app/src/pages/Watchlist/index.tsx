import { useSelector } from "react-redux";
import { AnimatePresence, m } from "framer-motion";

import { MovieCard } from "@/common";
import WatchlistEmptyState from "./WatchlistEmptyState";
import { selectWatchlistItems } from "@/features/watchlist/watchlistSlice";
import { smallMaxWidth } from "@/styles";
import { IMovie } from "@/types";

const Watchlist = () => {
  const items = useSelector(selectWatchlistItems);

  return (
    <>
      <div className="pt-28 pb-6 dark:bg-[#111] bg-gray-100 text-center">
        <h1 className="sm:text-3xl text-2xl font-bold dark:text-gray-50 text-gray-800 font-nunito">
          Your Watchlist
        </h1>
        {items.length > 0 && (
          <p className="text-sm dark:text-gray-400 text-gray-500 mt-1">
            {items.length} {items.length === 1 ? "title" : "titles"}
          </p>
        )}
      </div>

      <section className={`${smallMaxWidth} py-8 min-h-[60vh]`}>
        {items.length === 0 ? (
          <WatchlistEmptyState />
        ) : (
          <div className="flex flex-wrap xs:gap-4 gap-[14px] justify-center">
            <AnimatePresence>
              {items.map((item) => {
                const movie: IMovie = {
                  id: item.id,
                  poster_path: item.poster_path,
                  original_title: item.title,
                  name: item.title,
                  overview: "",
                  backdrop_path: "",
                };
                return (
                  <m.div
                    key={item.id}
                    layout
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col xs:gap-4 gap-2 xs:max-w-[170px] max-w-[124px] rounded-lg lg:mb-6 md:mb-5 sm:mb-4 mb-[10px]"
                  >
                    <MovieCard movie={movie} category={item.category} />
                  </m.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>
    </>
  );
};

export default Watchlist;
