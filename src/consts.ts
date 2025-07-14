import type { IconMap, SocialLink, Site } from '@/types'

export const SITE: Site = {
  title: 'quartzeast.github.io',
  description:
    '我是一名来自长沙的 Go/DevOps 工程师和 Linux 爱好者。',
  href: 'https://quartzeast.github.io',
  author: 'quartzeast',
  locale: 'zh-CN',
  featuredPostCount: 2,
  postsPerPage: 4,
}

export const NAV_LINKS: SocialLink[] = [
  {
    href: '/',
    label: '主页',
  },
  {
    href: '/blog',
    label: '博客',
  },
]

export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: 'https://github.com/quartzeast',
    label: 'GitHub',
  },
  {
    href: 'https://twitter.com/quartzeast',
    label: 'Twitter',
  },
  {
    href: 'mailto:quartzeast@gmail.com',
    label: '邮箱',
  },
  {
    href: '/rss.xml',
    label: 'RSS',
  },
]

export const ICON_MAP: IconMap = {
  网站: 'lucide:globe',
  GitHub: 'lucide:github',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:twitter',
  邮箱: 'lucide:mail',
  RSS: 'lucide:rss',
}
