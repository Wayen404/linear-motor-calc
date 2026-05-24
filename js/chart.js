/**
 * 图表绘制模块
 * 使用 {x, y} 数据格式 + 线性 x 轴，确保时间轴按真实比例显示
 */
const ChartDrawer = {
  speedChart: null,
  thrustChart: null,

  /**
   * 生成速度曲线和推力曲线的数据点 (返回 {x, y} 点阵)
   */
  generatePlotData(profile, forces) {
    const { t1, t2, t3, t4, VmaxActual } = profile;
    const points = 50;
    const totalTime = t1 + t2 + t3 + t4;

    const speedPts = [];
    const thrustPts = [];
    let currentTime = 0;

    function addSegment(duration, speedFn, thrustFn) {
      if (duration <= 0) return;
      const n = Math.max(1, Math.ceil(points * duration / totalTime));
      for (let i = 0; i <= n; i++) {
        const ratio = i / n;
        const t = currentTime + ratio * duration;
        // 避免首点与上段末点完全重叠（跳过 i=0 除非是第一个段）
        if (i === 0 && currentTime > 0) {
          // 跳过重复点，Chart.js 自动连线
        } else {
          speedPts.push({ x: t, y: speedFn(ratio) });
          thrustPts.push({ x: t, y: thrustFn(ratio) });
        }
      }
      currentTime += duration;
    }

    // 加速段
    addSegment(t1,
      (ratio) => VmaxActual * ratio,
      () => forces.Fa
    );

    // 匀速段
    addSegment(t2,
      () => VmaxActual,
      () => forces.Fc
    );

    // 减速段
    addSegment(t3,
      (ratio) => VmaxActual * (1 - ratio),
      () => forces.Fd
    );

    // 暂停段
    addSegment(t4,
      () => 0,
      () => 0
    );

    return { speedPts, thrustPts };
  },

  /**
   * 绘制速度曲线
   */
  drawSpeedChart(canvasId, profile, forces) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.speedChart) this.speedChart.destroy();

    const data = this.generatePlotData(profile, forces);

    this.speedChart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: '速度 (m/s)',
          data: data.speedPts,
          borderColor: '#1a73e8',
          backgroundColor: 'rgba(26,115,232,0.08)',
          fill: true,
          tension: 0,
          pointRadius: 0,
          borderWidth: 2.5,
          parsing: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `速度: ${ctx.parsed.y.toFixed(2)} m/s`,
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: { display: true, text: '时间 (s)', font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: (v) => Number(v).toFixed(2) },
          },
          y: {
            title: { display: true, text: '速度 (m/s)', font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
            beginAtZero: true,
            ticks: { callback: (v) => Number(v).toFixed(2) },
          },
        },
      },
    });
  },

  /**
   * 绘制推力曲线
   */
  drawThrustChart(canvasId, profile, forces) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.thrustChart) this.thrustChart.destroy();

    const data = this.generatePlotData(profile, forces);

    // 计算合理的 Y 轴范围（分别取正负向极值）
    const allForces = data.thrustPts.map(p => p.y);
    const dataMin = Math.min(...allForces, 0);
    const dataMax = Math.max(...allForces, 1);
    const yPadding = Math.max((dataMax - dataMin) * 0.15, Math.abs(dataMin) * 0.15, 5);

    this.thrustChart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: '推力 (N)',
          data: data.thrustPts,
          borderColor: '#d93025',
          backgroundColor: 'rgba(217,48,37,0.08)',
          fill: true,
          tension: 0,
          pointRadius: 0,
          borderWidth: 2.5,
          parsing: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `推力: ${ctx.parsed.y.toFixed(2)} N`,
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: { display: true, text: '时间 (s)', font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: (v) => Number(v).toFixed(2) },
          },
          y: {
            title: { display: true, text: '推力 (N)', font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: (v) => Number(v).toFixed(2) },
            min: dataMin - yPadding,
            max: dataMax + yPadding,
          },
        },
      },
    });
  },
};
