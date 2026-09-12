import type { SvgIconProps } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import Check from '@mui/icons-material/Check';
import Remove from '@mui/icons-material/Remove';
import Search from '@mui/icons-material/Search';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import Pending from '@mui/icons-material/Pending';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Archive from '@mui/icons-material/Archive';
import Settings from '@mui/icons-material/Settings';
import FolderOpen from '@mui/icons-material/FolderOpen';
import FolderOff from '@mui/icons-material/FolderOff';
import Inbox from '@mui/icons-material/Inbox';
import Event from '@mui/icons-material/Event';
import Visibility from '@mui/icons-material/Visibility';
import Image from '@mui/icons-material/Image';
import Forum from '@mui/icons-material/Forum';
import ChatBubbleOutline from '@mui/icons-material/ChatBubbleOutlineOutlined';
import FormatBold from '@mui/icons-material/FormatBold';
import FormatListBulleted from '@mui/icons-material/FormatListBulleted';
import Code from '@mui/icons-material/Code';
import LightMode from '@mui/icons-material/LightMode';
import DarkMode from '@mui/icons-material/DarkMode';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Stop from '@mui/icons-material/Stop';
import RestartAlt from '@mui/icons-material/RestartAlt';
import RocketLaunch from '@mui/icons-material/RocketLaunch';
import Language from '@mui/icons-material/Language';
import MenuBook from '@mui/icons-material/MenuBook';
import Science from '@mui/icons-material/Science';
import Palette from '@mui/icons-material/Palette';
import Bolt from '@mui/icons-material/Bolt';
import Build from '@mui/icons-material/Build';
import Extension from '@mui/icons-material/Extension';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Forest from '@mui/icons-material/Forest';
import Public from '@mui/icons-material/Public';
import Terminal from '@mui/icons-material/Terminal';
import Info from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';
import type { ComponentType } from 'react';

const ICON_MAP: Record<string, ComponentType<SvgIconProps>> = {
  add: Add,
  close: Close,
  arrow_back: ArrowBack,
  arrow_upward: ArrowUpward,
  arrow_downward: ArrowDownward,
  expand_more: ExpandMore,
  expand_less: ExpandLess,
  more_horiz: MoreHoriz,
  check: Check,
  remove: Remove,
  search: Search,
  radio_button_unchecked: RadioButtonUnchecked,
  pending: Pending,
  check_circle: CheckCircle,
  edit: Edit,
  delete: Delete,
  delete_outline: DeleteOutline,
  link: LinkIcon,
  content_copy: ContentCopy,
  archive: Archive,
  settings: Settings,
  folder_open: FolderOpen,
  folder_off: FolderOff,
  inbox: Inbox,
  event: Event,
  visibility: Visibility,
  image: Image,
  forum: Forum,
  chat_bubble_outline: ChatBubbleOutline,
  format_bold: FormatBold,
  format_list_bulleted: FormatListBulleted,
  code: Code,
  light_mode: LightMode,
  dark_mode: DarkMode,
  play_arrow: PlayArrow,
  stop: Stop,
  restart_alt: RestartAlt,
  rocket_launch: RocketLaunch,
  language: Language,
  menu_book: MenuBook,
  science: Science,
  palette: Palette,
  bolt: Bolt,
  build: Build,
  extension: Extension,
  auto_awesome: AutoAwesome,
  forest: Forest,
  public: Public,
  terminal: Terminal,
  info: Info,
  error: ErrorIcon,
};

interface IconProps extends Omit<SvgIconProps, 'fontSize'> {
  name: string;
  size?: number;
}

export function Icon({ name, size = 20, sx, ...rest }: IconProps) {
  const Cmp = ICON_MAP[name];
  if (!Cmp) {
    return (
      <span
        style={{
          width: size,
          height: size,
          display: 'inline-block',
          background: 'currentColor',
          opacity: 0.4,
          borderRadius: '50%',
        }}
      />
    );
  }
  return <Cmp sx={{ fontSize: size, ...sx }} {...rest} />;
}
