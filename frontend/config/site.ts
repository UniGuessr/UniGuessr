export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "ConUGuessr",
  description: "How well do you know your campus?",
  navItems: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Single Player",
      href: "/single-player",
    },
    {
      label: "multiplayer",
      href: "/multiplayer",
    },
    {
      label: "Leaderboard",
      href: "/leaderboard",
    },
    {
      label: "Upload Image",
      href: "/upload",
    },
    {
        label: "Admin",
        href: "/admin",
        
    }
  ],
  navMenuItems: [
    {
      label: "Profile",
      href: "/profile",
    },
    {
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      label: "Projects",
      href: "/projects",
    },
    {
      label: "Team",
      href: "/team",
    },
    {
      label: "Calendar",
      href: "/calendar",
    },
    {
      label: "Settings",
      href: "/settings",
    },
    {
      label: "Help & Feedback",
      href: "/help-feedback",
    },
    {
      label: "Logout",
      href: "/logout",
    },
  ],
  links: {
    github: "https://github.com/heroui-inc/heroui",
    twitter: "https://twitter.com/hero_ui",
    docs: "https://heroui.com",
    discord: "https://discord.gg/9b6yyZKmH4",
    sponsor: "https://patreon.com/jrgarciadev",
  },
};
