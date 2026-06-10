import { Link } from "react-router-dom";
import { BsBookmark } from "react-icons/bs";

const WatchlistEmptyState = () => (
  <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
    <BsBookmark className="text-[64px] text-gray-400 dark:text-gray-600" />
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-bold dark:text-gray-100 text-gray-800">
        Nothing saved yet
      </h2>
      <p className="text-sm dark:text-gray-400 text-gray-500">
        Add movies and TV series to your watchlist to find them here.
      </p>
    </div>
    <Link
      to="/"
      className="sm:py-2 xs:py-[6px] py-1 sm:px-4 xs:px-3 px-[10.75px] bg-[#ff0000] text-gray-50 rounded-full md:text-[15.25px] sm:text-[14.75px] xs:text-[14px] text-[12.75px] shadow-md hover:-translate-y-1 transition-all duration-300 font-medium font-nunito"
    >
      Browse Movies
    </Link>
  </div>
);

export default WatchlistEmptyState;
