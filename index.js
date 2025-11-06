const svgcontainer = document.querySelector(".svgcontainer");
const audioFileInput = document.querySelector(".audiofile");
const audioPlayer = document.querySelector(".player");
audioPlayer.loop = true;
const progressBar = document.querySelector(".processbar");
const process = document.querySelector(".process");
const startTime = document.querySelector(".start");
const endTime = document.querySelector(".end");
const justSvg = document.querySelector(".svg");
const playBtn = document.querySelector(".play");
const pauseBtn = document.querySelector(".pause");
const audioName = document.querySelector(".name");
const leftContent = document.querySelector(".leftcontent");
const lyricsContainer = document.querySelector(".lyricscontainer");
const rightContent = document.querySelector(".rightcontent");
const mainDiv = document.querySelector(".main");
const exportVideoBtn = document.querySelector(".export-video");
const videoStatus = document.getElementById("videoStatus");
const processedLines = new Set();
let needProcess = undefined;
let width = 1280;
let height = 720;
let called = false;

// 常量
const LINE_HEIGHT = 20;
const LYRICS_OFFSET = window.innerHeight /3;

let lastLyric = -1
/*
function mainDivScalePosition(width, height) {
    // width: 1280, height: 720 (Image loaded)
    // width: 325, height: 437 (Image unloaded)
    const scaleX = mainDiv.clientWidth / width;
    const scaleY = mainDiv.clientHeight / height;
    const scale = Math.max(scaleX, scaleY);

    mainDiv.style.transform = `scale(${scale})`;
    mainDiv.style.top = `calc(50% - ${mainDiv.clientHeight / 2}px)`;
    mainDiv.style.left = `calc(50% - ${mainDiv.clientWidth / 2}px)`;

    rightContent.style.paddingLeft = `${10 / scaleX}%`;
}

window.addEventListener("resize", () => {
    mainDivScalePosition(width, height);
});
mainDivScalePosition(width, height);
*/
let bgImg = new Image();
// bgImg.src = "./default.svg";
let playing = false;
let isDragging = false;
let lrcData;
let lyrics = [];
let allTimes = [];
let lyricsElement = document.querySelector(".lyrics");
let reader;
let imageLoaded = false;
let audioLoaded = false;
let lrcLoaded = false;

svgcontainer.addEventListener("click", async () => {
    // const filePaths = await window.electron.openDialog();
    // if (filePaths && filePaths.length > 0) {
    //     // 处理选中的文件
    //     for (const filePath of filePaths) {
    //         const file = new File([await fetch(filePath).then(r => r.blob())], filePath.split('/').pop());
    //         const event = { target: { files: [file] } };
    //         audioFileInput.dispatchEvent(new CustomEvent('change', { detail: event }));
    //     }
    // }
    audioFileInput.click();
});

audioPlayer.addEventListener("loadedmetadata", () => {
    endTime.textContent = `-${formatTime(audioPlayer.duration)}`;
    // if (imageLoaded && audioLoaded && lrcLoaded) {
    //     setTimeout(() => {
    //         playBtn.click();
    //     }, 100);
    // } else if (!lrcLoaded && imageLoaded && audioLoaded) {
    //     window.dispatchEvent(new Event("resize"));
    //     setTimeout(() => {
    //         playBtn.click();
    //     }, 100);
    // }
    if (audioLoaded) {
        if (!lrcLoaded) {
            width = 325;
            height = 437;
           // window.dispatchEvent(new Event("resize"));
           // mainDiv.style.marginLeft = "0";
        }
        playBtn.click();
    } else {
        alert("请选择音频文件");
    }
});

audioFileInput.addEventListener("change", (event) => {
    const files = event.target.files;
    disableLyric();
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileURL = URL.createObjectURL(file);
        console.log(file.name);

        if (file.type.startsWith('image/')) {
            bgImg.src = fileURL;
            imageLoaded = true;
        } else if (file.type.startsWith('audio/')) {
            audioPlayer.src = fileURL;

            let filename = file.name.split('.')[0];
            if (filename.length > 30) {
                filename = filename.substring(0, 30) + "...";
            }
            audioName.textContent = filename;
            audioLoaded = true;
        } else if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith(".lrc")) {
            reader = new FileReader();
            reader.onload = function (e) {
                enableLyric();
                const buffer = e.target.result;
                // 常见编码检测顺序：UTF-8 > GBK > Big5 > Shift_JIS
                const encodings = ['utf-8', 'gbk', 'big5', 'shift_jis'];
                let decodedText = '';

                for (const encoding of encodings) {
                    try {
                        const decoder = new TextDecoder(encoding, { fatal: true });
                        decodedText = decoder.decode(new Uint8Array(buffer));
                        break; // 解码成功则退出循环
                    } catch (e) {
                        continue; // 尝试下一种编码
                    }
                }

                if (!decodedText) {
                    // 所有编码尝试失败，使用默认UTF-8并替换非法字符
                    decodedText = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buffer));
                }

                lrcData = decodedText;
                let parsedData = parseLrc(lrcData);
                lyrics = parsedData.lyrics;
                allTimes = parsedData.allTimes;
                lyricsElement = document.querySelector(".lyrics");
                lyricsElement.innerHTML = "";
                //lyricsElement.innerHTML = lyrics.map(line => `<p data-text="${line.text}">${line.text}</p>`).join('');
                for (let i = 0; i < lyrics.length; i++) {
                    lyricsElement.appendChild(lyrics[i].ele)
                }
                UpdateLyricsLayout(0,lyrics,0)
                for (let i = 0; i < lyrics.length; i++) {
                    lyrics[i].ele.style.transition = "transform 0.7s cubic-bezier(.19,.11,0,1),color 0.5s ease-in-out";
                }
            };
            reader.readAsArrayBuffer(file);
            lrcLoaded = true;
        }
    }
});

function disableLyric() {
    rightContent.style.display = "none";
    leftContent.style.paddingLeft = "none";
}

function enableLyric() {
    rightContent.style.display = "";
    leftContent.style.paddingLeft = "";
}

function fetchLrcFile(filename) {
    return new Promise((resolve, reject) => {
        const lrcFileUrl = `${filename}`;
        fetch(lrcFileUrl)
            .then(response => {
                if (response.ok) {
                    return response.text();
                } else {
                    reject("No such lrc file");
                    disableLyric();
                }
            })
            .then(lrcData => resolve(lrcData))
            .catch(error => reject(error));
    });
}

audioPlayer.addEventListener("timeupdate", () => {
    if (audioPlayer.duration) {
        process.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
        startTime.textContent = formatTime(audioPlayer.currentTime);
        endTime.textContent = `-${formatTime(audioPlayer.duration - audioPlayer.currentTime)}`;
        // 歌词触发计算
        const cTime = audioPlayer.currentTime;
        
        let lList = [];
        for (let i = 0; i < lyrics.length; i++) {
            if (cTime >= lyrics[i].time) {
                lList.push(lyrics[i]);
            }
        }
        if (lList.length === 0) return;
        if (lastLyric !== lList.length - 1) {
           
            UpdateLyricsLayout(lList.length - 1,lyrics,1);
            console.log(lList[lList.length - 1].text);
            
            lastLyric = lList.length - 1
        }

    }
});

progressBar.addEventListener("mousedown", (event) => {
    if (Number.isNaN(audioPlayer.duration)) {
        return;
    }
    isDragging = true;
    updateProgress(event);
});

document.addEventListener("mousemove", (event) => {
    if (isDragging) {
        updateProgress(event);
    }
});

document.addEventListener("mouseup", () => {
    isDragging = false;
});

playBtn.addEventListener("click", () => {
    if (Number.isNaN(audioPlayer.duration)) {
        return;
    }
    playing = true;
    audioPlayer.play();
    pauseBtn.style.display = "block";
    playBtn.style.display = "none";
});

pauseBtn.addEventListener("click", () => {
    playing = false;
    audioPlayer.pause();
    pauseBtn.style.display = "none";
    playBtn.style.display = "block";
});

function updateProgress(event) {
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const progressBarWidth = rect.width;
    const percentage = (clickPosition / progressBarWidth) * 100;
    process.style.width = `${percentage}%`;
    audioPlayer.currentTime = (percentage / 100) * audioPlayer.duration;

    if (!playing) {
        playBtn.click();
    }
}

function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

function parseLrc(lrcText) {
    const lines = lrcText.trim().split('\n');
    const lrcArray = [];
    const allTimes = [];

    lines.forEach(line => {
        const timeMatch = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/);

        if (timeMatch) {
            const minutes = parseInt(timeMatch[1], 10);
            const seconds = parseInt(timeMatch[2], 10);
            const milliseconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

            const text = line.replace(timeMatch[0], '').trim();

            const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;

            allTimes.push(timeInSeconds);

            const div = document.createElement('div');
            div.className = 'item';
            const p = document.createElement('p');
            p.textContent = text;
            div.appendChild(p);
            if (text) {
                lrcArray.push({ time: timeInSeconds, text, ele: div });
            }
        }
    });

    //mainDivScalePosition(width, height);

    return {
        lyrics: lrcArray,
        allTimes: allTimes
    };
}
/*
function updateLyrics() {
    if (!playing) return;

    const currentTime = audioPlayer.currentTime;
    const lyricLines = lyricsElement.querySelectorAll('*');
    if (called) {
        lyricsElement.style.transition = "all 1s cubic-bezier(0.25, 0.8, 0.25, 1)";
    } else {
        centerActiveLine(lyricLines[0]);
    }
    let activeIndex = -1;

    for (let i = 0; i < lyrics.length; i++) {
        if (currentTime >= lyrics[i].time) {
            activeIndex = i;
        } else {
            break;
        }
    }

    lyricLines.forEach((line, index) => {
        const distance = Math.abs(activeIndex - index);
        const thisTime = allTimes[activeIndex];

        if (distance > 8) {
            line.style.visibility = "hidden";
            return;
        }

        if (index === activeIndex) {
            applyActiveLineStyle(line, index, lyricLines, thisTime);
        } else {
            applyNearbyLineStyle(line, distance);
        }
    });

    if (activeIndex >= 0) {
        requestAnimationFrame(() => {
            setTimeout(() => {
                centerActiveLine(lyricLines[activeIndex]);
            }, 120);
        });
    }

    requestAnimationFrame(updateLyrics);
}

function applyActiveLineStyle(line, index, allLines, thisTime) {
    void line.offsetWidth;
    setTimeout(() => {
        line.classList.add("highlight");
        line.style.filter = "none";
        line.style.marginLeft = "0";
        line.style.visibility = "visible";
        line.style.opacity = "0.6";
        line.style.setProperty("--type-time", `${thisTime / 2}s`);
    }, 300);

    if (!processedLines.has(index)) {
        processedLines.add(index);

        const start = Math.max(0, index - 3);
        const end = Math.min(allLines.length - 1, index + 3);
        const displayingLines = Array.from(allLines).slice(start, end + 1);

        displayingLines.forEach((nline, i) => {
            setTimeout(() => {
                nline.style.marginTop = `${line.clientHeight}px`;

                setTimeout(() => {
                    nline.style.marginTop = "4%";
                }, 250);
            }, i * 75);
        });
    }
}

function applyNearbyLineStyle(line, distance) {
    void line.offsetWidth;
    line.classList.remove("highlight");
    line.style.filter = `blur(${distance * 0.5}px)`;
    line.style.marginLeft = `${distance * 1.25}px`;
    line.style.opacity = `${0.3 - distance / 100}`;
    line.style.visibility = "visible";
}

function centerActiveLine(activeLine) {
    if (!activeLine) return;
    if (!called) called = true;

    const container = document.querySelector(".lyricscontainer");
    const containerHeight = container.clientHeight;
    const activeLineOffset = activeLine.offsetTop;
    const offset = (containerHeight / 2) - activeLineOffset - (0.1 * containerHeight);

    lyricsElement.style.transform = `translateY(${offset}px)`;
}
*/
audioPlayer.addEventListener('play', () => {
    //requestAnimationFrame(updateLyrics);
});
/*
window.addEventListener('resize', () => {
    lyricsElement.classList.add("noTransition");
    updateLyrics();
    lyricsElement.classList.remove("noTransition");
});

updateLyrics();
*/
function getDominantColors(imageData, colorCount = 5, minColorDistance = 100) {
    const pixels = imageData.data;
    const sampledColors = []; // 存储采样后的颜色（未去重）
    const dominantColors = []; // 最终返回的主色调（去重后）

    // 1. 每隔 16 个像素采样一次（减少计算量）
    for (let i = 0; i < pixels.length; i += 4 * 13) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        sampledColors.push([r, g, b]);
    }

    sampledColors.forEach(([r, g, b]) => {
        const isUnique = dominantColors.every(([er, eg, eb]) => {
            const distance = Math.sqrt((r - er) ** 2 + (g - eg) ** 2 + (b - eb) ** 2);
            return distance >= minColorDistance; // 颜色差异足够大才保留
        });

        if (isUnique) {
            dominantColors.push([r, g, b]);
            if (dominantColors.length >= colorCount) return; // 提前终止
        }

        console.log(r, g, b)
    });

    return dominantColors.map(([r, g, b]) => `rgba(${r},${g},${b},0.9)`);
}

bgImg.onload = () => {
    justSvg.style.display = "none";
    svgcontainer.style.background = `url(${bgImg.src})`;
    svgcontainer.style.backgroundSize = "cover";
    svgcontainer.style.backgroundPosition = "center";
    svgcontainer.style.backgroundRepeat = "no-repeat";

    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')

    tempCanvas.width = 100
    tempCanvas.height = 100 * (bgImg.height / bgImg.width)

    tempCtx.drawImage(bgImg, 0, 0, tempCanvas.width, tempCanvas.height)
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)

    let colors = getDominantColors(imageData);
    document.body.style.setProperty('--background', colors[0]);
    document.body.style.setProperty('--color1', colors[0]);
    document.body.style.setProperty('--color2', colors[1]);
    document.body.style.setProperty('--color3', colors[2]);
    document.body.style.setProperty('--color4', colors[3]);
    document.body.style.setProperty('--color5', colors[4]);
    document.body.style.setProperty('--color1-rgba', colors[0].replace("0.9", "0"));
    document.body.style.setProperty('--color2-rgba', colors[1].replace("0.9", "0"));
    document.body.style.setProperty('--color3-rgba', colors[2].replace("0.9", "0"));
    document.body.style.setProperty('--color4-rgba', colors[3].replace("0.9", "0"));
    document.body.style.setProperty('--color5-rgba', colors[4].replace("0.9", "0"));
}



// 新增的函数

// 动态计算布局的函数
function GetLyricsLayout(now, to, data) {
    let res = 0;
    // 判断滚动方向
    if (to > now) { // 向下滚动
        for (let i = now; i < to; i++) {
            res += data[i].ele.offsetHeight + LINE_HEIGHT;
        }
    } else { // 向上滚动
        for (let i = now; i > to; i--) {
            res -= data[i - 1].ele.offsetHeight + LINE_HEIGHT;
        }
    }

    // 使用偏移值作为初始位置，确保歌词居中或位于正确位置
    return res + LYRICS_OFFSET;
}

function UpdateLyricsLayout(index, data,init = 1) {

    for (let i = 0; i < data.length; i++) {

        if (i === index && init) {
            data[i].ele.style.color = "rgba(255,255,255,1)"

        }else{
            data[i].ele.style.color = "rgba(255,255,255,0.2)"
        }
        data[i].ele.style.filter = `blur(${Math.abs(i - index)}px)`
        const position = GetLyricsLayout(index, i, data);

        let n = (i- index)+1
        if (n>10){
            n=0
        }
        setTimeout(() => {
            data[i].ele.style.transform = `translateY(${position}px)`;
        },  (n * 70 - n * 10) * init);
    }
}

// 视频导出功能
exportVideoBtn.addEventListener("click", async () => {
    if (!audioLoaded || !audioPlayer.src) {
        updateVideoStatus("请先选择音频文件", "error");
        return;
    }

    if (!lrcLoaded) {
        updateVideoStatus("请先选择歌词文件", "error");
        return;
    }

    try {
        await exportVideoWithLyrics();
    } catch (error) {
        console.error("视频导出失败:", error);
        updateVideoStatus("导出失败: " + error.message, "error");
    }
});

function updateVideoStatus(message, type = "info") {
    videoStatus.textContent = message;
    videoStatus.className = "video-status";
    if (type !== "info") {
        videoStatus.classList.add(type === "error" ? "export-error" :
                                   type === "complete" ? "export-complete" : "exporting");
    }
}

async function exportVideoWithLyrics() {
    updateVideoStatus("准备导出视频...", "exporting");

    // 创建canvas和音频上下文
    const canvas = document.createElement('canvas');
    canvas.width = 1920;  // 视频宽度
    canvas.height = 1080; // 视频高度
    const ctx = canvas.getContext('2d');

    // 创建离屏canvas用于背景
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;
    const bgCtx = bgCanvas.getContext('2d');

    // 设置视频录制参数
    const stream = canvas.captureStream(30); // 30fps
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(audioPlayer);
    const destination = audioCtx.createMediaStreamDestination();
    source.connect(destination);
    source.connect(audioCtx.destination);

    const audioStream = destination.stream;
    const combinedStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...audioStream.getAudioTracks()
    ]);

    const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 5000000 // 5Mbps
    });

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunks.push(e.data);
        }
    };

    mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        downloadVideo(url);
        updateVideoStatus("视频导出完成！", "complete");
    };

    updateVideoStatus("开始录制...");
    mediaRecorder.start();

    // 保存原始播放状态
    const wasPlaying = playing;
    const originalCurrentTime = audioPlayer.currentTime;

    // 从头开始播放
    audioPlayer.currentTime = 0;
    if (!wasPlaying) {
        audioPlayer.play();
    }

    // 渲染函数
    let startTime = Date.now();

    function renderFrame() {
        const currentTime = (Date.now() - startTime) / 1000;

        // 绘制背景
        drawBackground(bgCtx, canvas.width, canvas.height, currentTime);
        ctx.drawImage(bgCanvas, 0, 0);

        // 绘制左侧专辑封面
        drawAlbumCover(ctx, canvas.width, canvas.height);

        // 绘制歌词
        drawLyrics(ctx, canvas.width, canvas.height, currentTime);

        // 绘制播放进度条
        drawProgressBar(ctx, canvas.width, canvas.height, currentTime);

        // 检查是否完成
        if (currentTime >= audioPlayer.duration) {
            mediaRecorder.stop();
            return;
        }

        requestAnimationFrame(renderFrame);
    }

    renderFrame();
}

function drawBackground(ctx, width, height, time) {
    // 创建渐变背景，使用提取的颜色
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    const colors = [
        getComputedStyle(document.body).getPropertyValue('--color1') || 'rgba(232, 232, 232, 0.9)',
        getComputedStyle(document.body).getPropertyValue('--color2') || 'rgba(197, 197, 199, 0.9)',
        getComputedStyle(document.body).getPropertyValue('--color3') || 'rgba(255, 255, 255, 0.9)'
    ];

    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.5, colors[1]);
    gradient.addColorStop(1, colors[2]);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 添加动态效果
    const timeOffset = time * 20; // 动画速度
    const gradient2 = ctx.createRadialGradient(
        Math.sin(timeOffset * 0.1) * width * 0.3 + width * 0.5,
        Math.cos(timeOffset * 0.15) * height * 0.3 + height * 0.5,
        width * 0.1,
        width * 0.5,
        height * 0.5,
        width * 0.8
    );
    gradient2.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gradient2.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient2;
    ctx.fillRect(0, 0, width, height);
}

function drawAlbumCover(ctx, width, height) {
    const coverSize = Math.min(width, height) * 0.4; // 封面大小
    const coverX = width * 0.2 - coverSize / 2;
    const coverY = height * 0.5 - coverSize / 2;
    const coverRadius = 15; // 圆角半径

    // 绘制阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;

    // 绘制圆角矩形封面
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    roundRect(ctx, coverX, coverY, coverSize, coverSize, coverRadius);
    ctx.fill();

    // 如果有图片，绘制图片
    if (imageLoaded && bgImg.complete) {
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, coverX, coverY, coverSize, coverSize, coverRadius);
        ctx.clip();
        ctx.drawImage(bgImg, coverX, coverY, coverSize, coverSize);
        ctx.restore();
    } else {
        // 绘制默认音符图标
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = `${coverSize * 0.3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♪', coverX + coverSize / 2, coverY + coverSize / 2);
    }

    ctx.shadowColor = 'transparent';
}

function drawLyrics(ctx, width, height, currentTime) {
    const lyricsAreaX = width * 0.5;
    const lyricsAreaWidth = width * 0.45;
    const lyricsAreaY = height * 0.2;
    const lyricsAreaHeight = height * 0.6;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 48px "SFPro-Semibold", "PingFangSC-Semibold", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // 找到当前应该显示的歌词
    let currentLyricIndex = -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
        if (currentTime >= lyrics[i].time) {
            currentLyricIndex = i;
            break;
        }
    }

    if (currentLyricIndex >= 0) {
        // 计算歌词位置
        let yOffset = lyricsAreaHeight / 2;

        // 绘制当前及附近的歌词
        const startIdx = Math.max(0, currentLyricIndex - 3);
        const endIdx = Math.min(lyrics.length - 1, currentLyricIndex + 3);

        for (let i = startIdx; i <= endIdx; i++) {
            const distance = Math.abs(i - currentLyricIndex);
            const opacity = distance === 0 ? 1 : Math.max(0.1, 0.8 - distance * 0.2);
            const blur = distance * 2;
            const scale = distance === 0 ? 1 : Math.max(0.7, 1 - distance * 0.1);

            ctx.save();

            // 设置透明度和模糊效果
            ctx.globalAlpha = opacity;
            ctx.filter = `blur(${blur}px)`;

            // 缩放和位置
            const x = lyricsAreaX + 50;
            const y = lyricsAreaY + yOffset + (i - currentLyricIndex) * 80;

            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.fillText(lyrics[i].text, 0, 0);
            ctx.restore();

            ctx.restore();
        }
    }

    ctx.restore();
}

function drawProgressBar(ctx, width, height, currentTime) {
    const barWidth = width * 0.6;
    const barHeight = 8;
    const barX = width * 0.2;
    const barY = height * 0.85;

    // 背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    roundRect(ctx, barX, barY, barWidth, barHeight, 4);
    ctx.fill();

    // 进度
    const progress = Math.min(1, currentTime / audioPlayer.duration);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    roundRect(ctx, barX, barY, barWidth * progress, barHeight, 4);
    ctx.fill();

    // 时间显示
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '24px "SFPro-Regular", "PingFangSC-Regular", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const currentTimeStr = formatTime(currentTime);
    const totalTimeStr = formatTime(audioPlayer.duration);
    ctx.fillText(`${currentTimeStr} / ${totalTimeStr}`, width / 2, barY + 40);
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function downloadVideo(url) {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${audioName.textContent || 'lyrics_video'}.webm`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}
