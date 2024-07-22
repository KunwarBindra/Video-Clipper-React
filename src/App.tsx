import { useState, useEffect, useRef } from "react";
import { css } from "@emotion/css";
import { a, useSpring, to } from "react-spring";
import { useDrag } from "react-use-gesture";
import clamp from "lodash/clamp";
import videojs from 'video.js'
import "video.js/dist/video-js.css";
import "@videojs/http-streaming";
import "videojs-offset";

const HOUR_IN_MS = 3600000;

const formatTime = (ms: any) => {
  const date = new Date();
  date.setMilliseconds(Math.floor(ms));

  if (ms <= HOUR_IN_MS) {
    return date?.toISOString().substr(14, 5);
  }

  return date?.toISOString().substr(11, 8);
};

const OUTER_WIDTH = 800;
const HANDLE_WIDTH = 27;
const INNER_WIDTH = OUTER_WIDTH - HANDLE_WIDTH * 2;
const BORDER_WIDTH = 6;

const HandleStrip = () => {
  return (
    <div
      className={css`
        height: 20px;
        border-radius: 32px;
        width: 3px;
        background: currentColor;
      `}
    />
  );
};

const Handle = ({ position, ...rest }: any) => {
  return (
    <a.div
      className={css`
        position: absolute;
        top: 0;
        ${position}: 0;
        height: 100%;
        width: ${HANDLE_WIDTH}px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: w-resize;
        background: #ffcd02;
      `}
      {...rest}
    >
      <HandleStrip />
    </a.div>
  );
};

const pxToPc = (px: any, max: any) => (px * 100) / max;
const pcToPx = (pc: any, max: any) => (pc * max) / 100;

const pxToPcOuter = (px: any) => pxToPc(px, OUTER_WIDTH);
const pcToPxOuter = (pc: any) => pcToPx(pc, OUTER_WIDTH);
const pxToPcInner = (px: any) => pxToPc(px, INNER_WIDTH);
// const pcToPxInner = (pc) => pcToPx(pc, INNER_WIDTH)

const Time = ({ time }: any) => {
  return <span>{formatTime(time * 1000)}</span>;
};

const AnimatedTime = a(Time);

const Timeline = ({
  duration,
  currentTime,
  setStartTime,
  setCurrentTime,
  setEndTime,
  startTime,
  endTime,
  playerRef,
}: any) => {
  const [{ x, width, fromVisible, toVisible, active }, set] = useSpring(() => ({
    x: 0,
    width: "100%",
    active: false,
    fromVisible: false,
    toVisible: false,
    config: { precision: 0.01 },
    immediate: true,
  }));

  const bindLeft = useDrag(
    ({ movement: [mx], first, memo, down }) => {
      if (first) memo = { width: width.get(), x: x.get() };
      const maxX =
        pcToPxOuter(memo.width.slice(0, -1)) + memo.x - 2 * HANDLE_WIDTH;
      const nextX = clamp(mx, 0, maxX);
      const nextWidth =
        memo.width.slice(0, -1) - pxToPcOuter(nextX - memo.x) + "%";
      set({
        x: nextX,
        width: nextWidth,
        active: nextX !== 0 || nextWidth !== "100%",
        fromVisible: down,
        immediate: true,
      });
      return memo;
    },
    { initial: () => [x.get()] }
  );
  const bindRight = useDrag(({ movement: [ox], first, memo, down }) => {
    if (first) memo = width.get();
    const maxWidth = pxToPcOuter(OUTER_WIDTH - x.get());
    const minWidth = pxToPcOuter(2 * HANDLE_WIDTH);
    const nextWidth =
      clamp(memo.slice(0, -1) - pxToPcOuter(-ox), minWidth, maxWidth) + "%";

    set({
      width: nextWidth,
      active: x.get() !== 0 || nextWidth !== "100%",
      toVisible: down,
      immediate: true,
    });
    return memo;
  });

  const bindMiddle = useDrag(
    ({ movement: [mx], down }) => {
      const maxX = OUTER_WIDTH - pcToPxOuter(width.get().slice(0, -1));
      const nextX = clamp(mx, 0, maxX);
      set({ x: nextX, fromVisible: down, toVisible: down, immediate: true });
    },
    { initial: () => [x.get()] }
  );

  const bindCurrentTime = useDrag(({ movement: [mx], memo = 0, down }) => {
    const deltaTime = (mx / OUTER_WIDTH) * duration;
    const newTime = clamp(memo + deltaTime, startTime, endTime);
    if (down) {
      setCurrentTime(newTime * 1000);
      playerRef?.current?.currentTime(newTime);
    } else {
      memo = newTime;
    }
    return memo;
  });

  return (
    <div
      className={css`
        width: ${OUTER_WIDTH}px;
        height: 100%;
        touch-action: none;
        user-select: none;
        -webkit-touch-callout: none;
      `}
    >
      <div
        className={css`
          position: relative;
          border-radius: 0.5rem;
          width: 100%;
          height: 100%;
        `}
      >
        <div
          className={css`
            width: 100%;
            height: 100%;
            padding: ${BORDER_WIDTH}px ${HANDLE_WIDTH}px;
          `}
        >
          <div
            className={css`
              position: relative;
              width: 100%;
              height: 100%;
            `}
          >
            <div
              className={css`
                width: 100%;
                height: 100%;
                background: #444;
              `}
            />
            <div
              id="slider-currentTime"
              className={css`
                width: 10px;
                height: 100%;
                background: white;
                position: absolute;
                top: 50%;
                left: ${(currentTime / 1000) * (100 / duration)}%;
                transform: translate(-50%, -50%);
                border: 1px solid rgba(0, 0, 0, 0.2);
                z-index: 1;
                cursor: pointer;
              `}
              {...bindCurrentTime()}
            />
          </div>
        </div>
        <a.div
          className={css`
            top: 0;
            width: 100%;
            height: 100%;
            border-radius: 0.5rem;
            border-top: ${BORDER_WIDTH}px solid;
            border-bottom: ${BORDER_WIDTH}px solid
              ${active ? "#ffcd02" : "#222"};
            position: absolute;
          `}
          style={{
            x,
            width,
            borderColor: active.to((active) => (active ? "#ffcd02" : "#222")),
          }}
        >
          <a.div
            {...bindMiddle()}
            className={css`
              position: absolute;
              width: 100%;
              height: 100%;
              cursor: grab;

              &:active {
                cursor: grabbing;
              }
            `}
          />
          <Handle
            position="left"
            {...bindLeft()}
            style={{
              background: active.to((active) => (active ? "#ffcd02" : "#222")),
              color: active.to((active) => (active ? "#000" : "#fff")),
            }}
          />
          <Handle
            position="right"
            {...bindRight()}
            style={{
              background: active.to((active) => (active ? "#ffcd02" : "#222")),
              color: active.to((active) => (active ? "#000" : "#fff")),
            }}
          />

          <a.div
            className={css`
              position: absolute;
              bottom: calc(100% + ${BORDER_WIDTH + 8}px);
              left: ${HANDLE_WIDTH}px;
              color: white;
            `}
            style={{
              display: fromVisible.to((visible) =>
                visible ? "block" : "none"
              ),
            }}
          >
            <div
              className={css`
                transform: translateX(calc(-50% + 1px));
              `}
            >
              {/* <AnimatedTime time={x.to((x) => ((x * 100) / INNER_WIDTH) * duration / 100)} /> */}

              <AnimatedTime
                time={to([x, width], (x: any) => {
                  setStartTime((((x * 100) / INNER_WIDTH) * duration) / 100);
                  return (((x * 100) / INNER_WIDTH) * duration) / 100;
                })}
              />
            </div>
            <div
              className={css`
                width: 1px;
                height: 2rem;
                background: white;
              `}
            />
          </a.div>
          <a.div
            className={css`
              position: absolute;
              bottom: calc(100% + ${BORDER_WIDTH + 8}px);
              right: ${HANDLE_WIDTH}px;
              color: white;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
            `}
            style={{
              display: toVisible.to((visible) => (visible ? "flex" : "none")),
            }}
          >
            <div
              className={css`
                transform: translateX(calc(50% - 1px));
              `}
            >
              <AnimatedTime
                time={to([x, width], (x, width: any) => {
                  const innerXPc = pxToPcInner(x);
                  const outerWidthPx = pcToPxOuter(width.slice(0, -1));
                  const innerWidthPc = pxToPcInner(
                    outerWidthPx - HANDLE_WIDTH * 2
                  );
                  setEndTime(((innerWidthPc + innerXPc) * duration) / 100);
                  return ((innerWidthPc + innerXPc) * duration) / 100;
                })}
              />
            </div>
            <div
              className={css`
                width: 1px;
                height: 2rem;
                background: white;
              `}
            />
          </a.div>
        </a.div>
      </div>
    </div>
  );
};

function App() {
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [editorElement, setEditorElement] = useState<any>(null);
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
  const [showFinalCut, setShowFinalCut] = useState(false);
  const [finalElement, setFinalElement] = useState<any>(null);
  const finalRef = useRef<any>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");

  useEffect(() => {
    if (editorElement && !playerRef.current) {
      const options = {
        controls: false,
        fluid: true,
      };
      const player = videojs(editorElement, options, () => {
        playerRef.current = player;
        setIsPlayerReady(true);
      });

      return () => {
        if (playerRef.current) {
          playerRef?.current?.dispose();
          playerRef.current = null;
          setIsPlayerReady(false);
        }
      };
    }
  }, [editorElement]);

  useEffect(() => {
    if (playing) {
      playerRef?.current?.play();
    } else {
      playerRef?.current?.pause();
    }
  }, [playing]);

  useEffect(() => {
    if (isPlayerReady && playerRef.current) {
      playerRef?.current?.src({
        src: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        type: "video/mp4",
      });
      playerRef?.current?.on("loadedmetadata", handleLoadedMetadata);
      setVideoUrl(
        "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      );
    }
    // eslint-disable-next-line
  }, [isPlayerReady]);

  const handleLoadedMetadata = () => {
    const duration = playerRef?.current?.duration();
    setDuration(duration);
    setEndTime(duration);
  };

  useEffect(() => {
    const handleTimeUpdate = () => {
      let currentTime = playerRef?.current?.currentTime();
      setCurrentTime(currentTime * 1000);
      if (currentTime < startTime) {
        playerRef?.current?.currentTime(startTime);
      }
      if (currentTime >= endTime) {
        playerRef?.current?.pause();
        playerRef?.current?.currentTime(startTime);
      }
    };

    if (isPlayerReady && playerRef.current) {
      if (currentTime < startTime) {
        playerRef?.current?.currentTime(startTime);
      }
      playerRef?.current?.on("timeupdate", handleTimeUpdate);
      return () => {
        playerRef?.current?.off("timeupdate", handleTimeUpdate);
      };
    }
    // eslint-disable-next-line
  }, [isPlayerReady, startTime, endTime]);

  useEffect(() => {
    if (finalElement && showFinalCut) {
      const options = {
        controls: true,
        fluid: true,
      };
      require('videojs-offset');
      const myPlayer: any = videojs(finalElement, options, () => {
        myPlayer.src({
          src: videoUrl,
          type: "video/mp4",
        });
        console.log(myPlayer)
        myPlayer.offset({
          start: startTime,
          end: endTime,
          restart_beginning: true, //Should the video go to the beginning when it ends
        });
        finalRef.current = myPlayer;
      });
    }
    // eslint-disable-next-line
  }, [showFinalCut]);

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        minWidth: "930px",
        minHeight: "200px",
        backgroundColor: "background.paper",
        padding: "16px",
        borderRadius: "5px",
        textAlign: "center",
      }}
    >
      <label
        id="modal-modal-title"
        style={{ fontSize: "28px", marginBottom: "10px" }}
      >
        {showFinalCut ? "Final Cut" : "Trim Video"}
      </label>
      <div>
        <div
          data-vjs-player
          style={{ display: showFinalCut ? "block" : "none" }}
        >
          <video
            ref={setFinalElement}
            className="video-js vjs-default-skin"
            style={{ width: "100%" }}
          />
        </div>
        <div
          data-vjs-player
          style={{ display: showFinalCut ? "none" : "block" }}
        >
          <video
            ref={setEditorElement}
            className="video-js vjs-default-skin"
            style={{ width: "100%" }}
          />
          <div
            id="slider-container"
            className={css`
              position: absolute;
              bottom: 10px; /* Adjust this value as needed */
              left: 50%;
              transform: translateX(-50%);
              display: flex;
              align-items: center;
              background: rgba(0, 0, 0, 0.5);
              padding: 10px;
              border-radius: 5px;
            `}
          >
            <button
              onClick={() => setPlaying(!playing)}
              type="button"
              className={css`
                cursor: pointer;
                font-size: 1em;
                margin: 0;
                border: none;
                padding: 0;
                height: 50px;
                width: 50px;
                background: #222;
                margin-right: 3px;
                border-top-left-radius: 0.5rem;
                border-bottom-left-radius: 0.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
              `}
            >
              {playing ? (
                <label style={{ color: "white" }}>Pause</label>
              ) : (
                <label style={{ color: "white" }}>Play</label>
              )}
            </button>
            <div
              className={css`
                width: ${OUTER_WIDTH}px;
                height: 50px;
                background: #222;
                border-top-right-radius: 0.5rem;
                border-bottom-right-radius: 0.5rem;
                display: flex;
                align-items: center;
              `}
            >
              <Timeline
                duration={duration}
                currentTime={currentTime}
                setStartTime={setStartTime}
                setCurrentTime={setCurrentTime}
                setEndTime={setEndTime}
                startTime={startTime}
                endTime={endTime}
                playerRef={playerRef}
              />
            </div>
          </div>
        </div>
        {!showFinalCut && (
          <button
            onClick={() => {
              if (playing) playerRef?.current?.pause();
              setShowFinalCut((prev) => !prev);
            }}
            style={{ marginTop: "20px" }}
          >
            Trim
          </button>
        )}
        {showFinalCut && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              marginTop: "20px",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => {
                finalRef?.current?.pause();
                setShowFinalCut((prev) => !prev);
              }}
              style={{ width: 150 }}
            >
              Revert
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
