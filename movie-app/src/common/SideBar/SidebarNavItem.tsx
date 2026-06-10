import { useSelector } from "react-redux";
import { NavLink } from "react-router-dom";

import { INavLink } from "@/types";
import { listItem, activeListItem } from "@/styles";
import { cn } from "@/utils/helper";
import { selectWatchlistCount } from "@/features/watchlist/watchlistSlice";

interface SidebarNavItemProps {
  link: INavLink;
  closeSideBar: () => void;
}

const SidebarNavItem = ({ link, closeSideBar }: SidebarNavItemProps) => {
  const watchlistCount = useSelector(selectWatchlistCount);
  const isWatchlistLink = link.path === "/watchlist";

  return (
    <li>
      <NavLink
        to={link.path}
        className={({ isActive }) => {
          return cn(listItem, isActive && activeListItem);
        }}
        onClick={closeSideBar}
      >
        {<link.icon className="text-[18px]" />}
        <span>{link.title}</span>
        {isWatchlistLink && watchlistCount > 0 && (
          <span className="ml-auto text-[10px] bg-[#ff0000] text-white rounded-full px-[5px] py-[1px] font-bold">
            {watchlistCount > 99 ? "99+" : watchlistCount}
          </span>
        )}
      </NavLink>
    </li>
  );
};

export default SidebarNavItem;
