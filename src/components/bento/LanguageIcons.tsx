import { type IconType } from 'react-icons/lib'
import {
  SiC,
  SiJavascript,
  SiLatex,
  SiPython,
  SiTypescript,
  SiYaml,
  SiGo,
  SiGnubash, // Bash 图标
} from 'react-icons/si'

export const languageIcons: { [key: string]: IconType } = {
  javascript: SiJavascript,
  python: SiPython,
  c: SiC,
  typescript: SiTypescript,
  yaml: SiYaml,
  tex: SiLatex,
  go: SiGo,
  bash: SiGnubash,
  shell: SiGnubash, // shell 脚本也用 bash 图标
  sh: SiGnubash, // .sh 文件也用 bash 图标
}

export const getLanguageIcon = (language: string): React.ReactNode | null => {
  const Icon = languageIcons[language]
  return Icon ? <Icon /> : null
}