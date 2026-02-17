import Slider from "@ant-design/react-slick"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {useRef, useState} from "react";

type User = {
  id: string
  username: string
}

interface AvatarCarouselProps {
  users: User[]
  chatOpen: boolean
  className?: string
}

export default function AvatarCarousel({ users, chatOpen, className }: AvatarCarouselProps) {
  const sliderRef = useRef<Slider | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)

  if (!users?.length) return null

  const show = Math.min(5, users.length)
  const isCarousel = users.length > 5

  const jump = (delta: number) => {
    if (!sliderRef.current) return

    const target = currentSlide + delta
    sliderRef.current.slickGoTo(target)
  }

  const settings = {
    infinite: true,
    speed: 500,
    centerMode: isCarousel,
    centerPadding: "0px",
    slidesToShow: isCarousel ? 5 : users.length,
    slidesToScroll: 1,
    arrows: false,
    swipeToSlide: true,
    afterChange: (index: number) => setCurrentSlide(index),
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 4,
          centerMode: true,
          centerPadding: "0px"
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 3,
          centerMode: true,
          centerPadding: "0px"
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          centerMode: true,
          centerPadding: "0px"
        }
      }
    ]
  }

  const truncate = (name: string, max = 12) =>
    name.length > max ? name.slice(0, max) + "…" : name

  const SlideContent = ({
    u,
    chatOpen,
    truncate
  }: {
    u: User
    chatOpen: boolean
    truncate: (name: string) => string
  }) => (
    <div className="relative flex justify-center">
      {chatOpen ? (
        <Avatar className="border-2 border-background cursor-default">
          <AvatarFallback>
            {u.username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="border-2 border-background cursor-default">
              <AvatarFallback>
                {u.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent sideOffset={15}>
            {u.username}
          </TooltipContent>
        </Tooltip>
      )}

      <div
        className="
        absolute
        -bottom-[6px]
        px-2 py-[2px]
        text-[8px]
        rounded-full
        bg-background/80
        backdrop-blur
        border
        border-border
        text-foreground
        shadow-sm
        whitespace-nowrap
      "
      >
        {truncate(u.username)}
      </div>
    </div>
  )

  return (
    <div className={["flex items-center gap-3", className].filter(Boolean).join(" ")}>

      <div className="flex items-center gap-2 flex-1 min-w-0">

        {/* Left Arrow */}
        {users.length > show && (
          <div className="flex flex-row items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => jump(-show)}
                  className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full bg-accent/60 hover:bg-accent transition"
                >
                  <ChevronLeft className="h-4 w-4 text-foreground -mr-2.5" />
                  <ChevronLeft className="h-4 w-4 text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={15}>
                Skip Previous
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => sliderRef.current?.slickPrev()}
                  className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full bg-accent/60 hover:bg-accent transition"
                >
                  <ChevronLeft className="h-4 w-4 text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={15}>
                Previous Player
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Slider */}
        <div className="flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            {isCarousel ? (
              <Slider ref={sliderRef} {...settings} className="avatar-slick">
                {users.map((u) => (
                  <div key={u.id} className="px-1">
                    <SlideContent u={u} chatOpen={chatOpen} truncate={truncate} />
                  </div>
                ))}
              </Slider>
            ) : (
              <div className="flex justify-center gap-2">
                {users.map((u) => (
                  <div key={u.id} className="px-1">
                    <SlideContent u={u} chatOpen={chatOpen} truncate={truncate} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Arrow */}
        {users.length > show && (
          <div className="flex flex-row items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => sliderRef.current?.slickNext()}
                  className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full bg-accent/60 hover:bg-accent transition"
                >
                  <ChevronRight className="h-4 w-4 text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={15}>
                Next Player
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => jump(show)}
                  className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full bg-accent/60 hover:bg-accent transition"
                >
                  <ChevronRight className="h-4 w-4 text-foreground -mr-2.5" />
                  <ChevronRight className="h-4 w-4 text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={15}>
                Skip Next
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Count */}
      <div
        className="
          shrink-0
          flex items-center gap-1.5
          px-3 py-1
          rounded-full
          bg-accent/10
          border border-accent/20
          text-xs font-medium
          text-accent
        "
      >
        <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
        {users.length} {users.length === 1 ? "Player" : "Players"}
      </div>

    </div>
  )
}
