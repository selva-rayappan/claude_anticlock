import { useSelector } from "react-redux";
import { NavLink } from "react-router-dom";

import { textColor } from "../../styles";
import { cn } from "../../utils/helper";
import { selectWatchlistCount } from "@/features/watchlist/watchlistSlice";

interface HeaderProps {
  link: { title: string; path: string };
  isNotFoundPage: boolean;
  showBg: boolean;
}

const HeaderNavItem = ({ link, showBg, isNotFoundPage }: HeaderProps) => {
  const watchlistCount = useSelector(selectWatchlistCount);
  const isWatchlistLink = link.path === "/watchlist";

  return (
    <li>
      <NavLink
        to={link.path}
        className={({ isActive }) => {
          return cn(
            "nav-link relative",
            isActive
              ? ` active ${showBg ? textColor : `text-secColor`}`
              : ` ${
                  isNotFoundPage || showBg
                    ? "text-[#444] dark:text-gray-300 dark:hover:text-secColor hover:text-black"
                    : "text-gray-300 hover:text-secColor"
                }`
          );
        }}
        end
      >
        {link.title}
        {isWatchlistLink && watchlistCount > 0 && (
          <span className="ml-1 text-[10px] bg-[#ff0000] text-white rounded-full px-[5px] py-[1px] font-bold align-middle">
            {watchlistCount > 99 ? "99+" : watchlistCount}
          </span>
        )}
      </NavLink>
    </li>
  );
};

export default HeaderNavItem;
