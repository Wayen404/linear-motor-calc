/**
 * 直线电机推力计算核心逻辑
 */
const Calculator = {
  G: 9.81, // 重力加速度 m/s²

  /** 电机数据库 — 汇川 Inovance 直驱电机 */
  MOTORS: {
    custom: { name: '自定义（手动输入）', coilMass: null, Kf: null, Icont: null, Ipeak: null, Fmag: null, Fcont: null, Fpeak: null },

    // ============================================================
    // MAP 系列 — 有铁芯平板直线电机
    // ============================================================
    // ---- MAP1-46 ----
    'map1-46-100': { name: 'MAP1-46-100', coilMass: 0.6, Kf: 23.5, Icont: 3, Ipeak: 12, Fmag: 550, Fcont: 68, Fpeak: 217 },
    'map1-46-185': { name: 'MAP1-46-185', coilMass: 1.1, Kf: 47, Icont: 3, Ipeak: 12, Fmag: 1100, Fcont: 136, Fpeak: 435 },

    // ---- MAP1-56 ----
    'map1-56-100':    { name: 'MAP1-56-100',    coilMass: 0.9, Kf: 27.5, Icont: 3, Ipeak: 12, Fmag: 650, Fcont: 83, Fpeak: 272 },
    'map1-56-185':    { name: 'MAP1-56-185',    coilMass: 1.7, Kf: 55, Icont: 3, Ipeak: 12, Fmag: 1300, Fcont: 165, Fpeak: 535 },
    'map1-56-270-y1': { name: 'MAP1-56-270 (Y1)', coilMass: 2.6, Kf: 82, Icont: 3, Ipeak: 12, Fmag: 1950, Fcont: 249, Fpeak: 797 },
    'map1-56-270-y2': { name: 'MAP1-56-270 (Y2)', coilMass: 2.6, Kf: 27.3, Icont: 6, Ipeak: 24, Fmag: 1950, Fcont: 249, Fpeak: 797 },

    // ---- MAP1-76 ----
    'map1-76-100':    { name: 'MAP1-76-100',    coilMass: 1.3, Kf: 43.2, Icont: 3, Ipeak: 12, Fmag: 1000, Fcont: 129.6, Fpeak: 418 },
    'map1-76-185-y1': { name: 'MAP1-76-185 (Y1)', coilMass: 2.4, Kf: 86.5, Icont: 2.8, Ipeak: 12, Fmag: 1900, Fcont: 242, Fpeak: 826 },
    'map1-76-185-y2': { name: 'MAP1-76-185 (Y2)', coilMass: 2.4, Kf: 43.2, Icont: 5.6, Ipeak: 24, Fmag: 1900, Fcont: 242, Fpeak: 826 },
    'map1-76-270-y1': { name: 'MAP1-76-270 (Y1)', coilMass: 3.5, Kf: 129.8, Icont: 2.6, Ipeak: 12, Fmag: 2900, Fcont: 337, Fpeak: 1234 },
    'map1-76-270-y2': { name: 'MAP1-76-270 (Y2)', coilMass: 3.5, Kf: 64.9, Icont: 5.2, Ipeak: 24, Fmag: 2900, Fcont: 337, Fpeak: 1234 },

    // ---- MAP1-96 ----
    'map1-96-100':    { name: 'MAP1-96-100',    coilMass: 1.7, Kf: 59, Icont: 2.8, Ipeak: 12, Fmag: 1350, Fcont: 165, Fpeak: 536 },
    'map1-96-185-y1': { name: 'MAP1-96-185 (Y1)', coilMass: 3.3, Kf: 118, Icont: 2.8, Ipeak: 12, Fmag: 2700, Fcont: 330, Fpeak: 1072 },
    'map1-96-185-y2': { name: 'MAP1-96-185 (Y2)', coilMass: 3.3, Kf: 59, Icont: 5.6, Ipeak: 24, Fmag: 2700, Fcont: 330, Fpeak: 1072 },
    'map1-96-270-y1': { name: 'MAP1-96-270 (Y1)', coilMass: 4.5, Kf: 177, Icont: 2.6, Ipeak: 12, Fmag: 4050, Fcont: 460, Fpeak: 1608 },
    'map1-96-270-y2': { name: 'MAP1-96-270 (Y2)', coilMass: 4.5, Kf: 88.5, Icont: 5.2, Ipeak: 24, Fmag: 4050, Fcont: 460, Fpeak: 1608 },

    // ============================================================
    // MAI 系列 — 无铁芯直线电机  (Fmag=0)
    // ============================================================
    // ---- MAI1-55 ----
    'mai1-55-60':  { name: 'MAI1-55-60',  coilMass: 0.12, Kf: 9, Icont: 2, Ipeak: 10, Fmag: 0, Fcont: 18, Fpeak: 90 },
    'mai1-55-90':  { name: 'MAI1-55-90',  coilMass: 0.18, Kf: 13.5, Icont: 2, Ipeak: 10, Fmag: 0, Fcont: 27, Fpeak: 135 },
    'mai1-55-120': { name: 'MAI1-55-120', coilMass: 0.24, Kf: 18, Icont: 2, Ipeak: 10, Fmag: 0, Fcont: 36, Fpeak: 180 },
    'mai1-55-150': { name: 'MAI1-55-150', coilMass: 0.28, Kf: 27, Icont: 2, Ipeak: 10, Fmag: 0, Fcont: 45, Fpeak: 225 },

    // ---- MAI1-68 ----
    'mai1-68-60':  { name: 'MAI1-68-60',  coilMass: 0.21, Kf: 14, Icont: 2.5, Ipeak: 12, Fmag: 0, Fcont: 35, Fpeak: 168 },
    'mai1-68-120': { name: 'MAI1-68-120', coilMass: 0.42, Kf: 28, Icont: 2.5, Ipeak: 12, Fmag: 0, Fcont: 70, Fpeak: 336 },
    'mai1-68-180': { name: 'MAI1-68-180', coilMass: 0.63, Kf: 42, Icont: 2.5, Ipeak: 12, Fmag: 0, Fcont: 105, Fpeak: 504 },
    'mai1-68-240': { name: 'MAI1-68-240', coilMass: 0.84, Kf: 56, Icont: 2.5, Ipeak: 12, Fmag: 0, Fcont: 140, Fpeak: 672 },
    'mai1-68-300': { name: 'MAI1-68-300', coilMass: 1.05, Kf: 70, Icont: 2.5, Ipeak: 12, Fmag: 0, Fcont: 175, Fpeak: 840 },

    // ============================================================
    // LMC 系列 — 直线模组  (移动质量含滑台板、动子、滑块)
    // ============================================================
    // ---- LMC88 ----
    'lmc88-100-y1': { name: 'LMC88-100Y1', coilMass: 1.0, Kf: 14.2, Icont: 3.6, Ipeak: 10.8, Fmag: 100, Fcont: 51, Fpeak: 99 },
    'lmc88-130-y1': { name: 'LMC88-130Y1', coilMass: 1.4, Kf: 26.7, Icont: 3.6, Ipeak: 10.8, Fmag: 300, Fcont: 96, Fpeak: 187 },
    'lmc88-185-y1': { name: 'LMC88-185Y1', coilMass: 1.9, Kf: 39.2, Icont: 3.6, Ipeak: 10.8, Fmag: 500, Fcont: 141, Fpeak: 275 },
    'lmc88-240-y1': { name: 'LMC88-240Y1', coilMass: 2.5, Kf: 51.7, Icont: 3.6, Ipeak: 10.8, Fmag: 700, Fcont: 186, Fpeak: 363 },

    // ---- LMC118 ----
    'lmc118-130-y1':  { name: 'LMC118-130Y1', coilMass: 2.8, Kf: 53.1, Icont: 3.2, Ipeak: 9.6, Fmag: 800, Fcont: 170, Fpeak: 374 },
    'lmc118-185-y1':  { name: 'LMC118-185Y1', coilMass: 3.7, Kf: 78.1, Icont: 3.2, Ipeak: 9.6, Fmag: 1100, Fcont: 250, Fpeak: 550 },
    'lmc118-185-y3':  { name: 'LMC118-185Y3', coilMass: 3.7, Kf: 26, Icont: 9.6, Ipeak: 28.8, Fmag: 1100, Fcont: 250, Fpeak: 550 },
    'lmc118-240-y2':  { name: 'LMC118-240Y2', coilMass: 4.6, Kf: 53.9, Icont: 6.4, Ipeak: 19.2, Fmag: 1500, Fcont: 345, Fpeak: 759 },
    'lmc118-355-y3':  { name: 'LMC118-355Y3', coilMass: 6.7, Kf: 51, Icont: 9.6, Ipeak: 28.8, Fmag: 2300, Fcont: 490, Fpeak: 1078 },

    // ---- LMC168 ----
    'lmc168-130-y2': { name: 'LMC168-130Y2', coilMass: 4.4, Kf: 51.6, Icont: 6.4, Ipeak: 19.2, Fmag: 1400, Fcont: 330, Fpeak: 726 },
    'lmc168-185-y3': { name: 'LMC168-185Y3', coilMass: 6.6, Kf: 51.6, Icont: 9.6, Ipeak: 28.8, Fmag: 2100, Fcont: 495, Fpeak: 1089 },
    'lmc168-240-y2': { name: 'LMC168-240Y2', coilMass: 8.2, Kf: 103.1, Icont: 6.4, Ipeak: 19.2, Fmag: 2800, Fcont: 660, Fpeak: 1452 },
    'lmc168-240-y4': { name: 'LMC168-240Y4', coilMass: 8.2, Kf: 51.6, Icont: 12, Ipeak: 32, Fmag: 2800, Fcont: 619, Fpeak: 1210 },

    // ---- LMC188 ----
    'lmc188-240-y2': { name: 'LMC188-240Y2', coilMass: 9.6, Kf: 103.1, Icont: 6.4, Ipeak: 19.2, Fmag: 2800, Fcont: 660, Fpeak: 1452 },
    'lmc188-240-y4': { name: 'LMC188-240Y4', coilMass: 9.6, Kf: 51.6, Icont: 12, Ipeak: 32, Fmag: 2800, Fcont: 619, Fpeak: 1210 },
    'lmc188-355-y3': { name: 'LMC188-355Y3', coilMass: 13.5, Kf: 103.1, Icont: 9.6, Ipeak: 28.8, Fmag: 4200, Fcont: 990, Fpeak: 2178 },
    'lmc188-355-y6': { name: 'LMC188-355Y6', coilMass: 13.5, Kf: 51.6, Icont: 19.2, Ipeak: 55, Fmag: 4200, Fcont: 990, Fpeak: 2080 },

    // ---- LMC228 ----
    'lmc228-240-y4': { name: 'LMC228-240Y4', coilMass: 14.0, Kf: 78.1, Icont: 12, Ipeak: 32, Fmag: 4300, Fcont: 938, Fpeak: 1833 },
    'lmc228-290-y5': { name: 'LMC228-290Y5', coilMass: 17.4, Kf: 77.2, Icont: 16, Ipeak: 45, Fmag: 5400, Fcont: 1235, Fpeak: 2547 },
  },

  /**
   * 将角度转换为弧度
   */
  degToRad(deg) {
    return deg * Math.PI / 180;
  },

  /**
   * 从用户输入的运动参数自动推导缺失值
   * @param {Object} raw - { S, Vmax, a, t_run }，缺失值为 null/0/undefined/''
   * @returns {{ S, Vmax, a, t_run, derivedKeys: string[], error: string|null }}
   */
  deriveMissingParam(raw) {
    const has = (v) => v !== null && v !== undefined && v !== '' && Number(v) > 0;
    const d = {};
    if (has(raw.S)) d.S = Number(raw.S);
    if (has(raw.Vmax)) d.Vmax = Number(raw.Vmax);
    if (has(raw.a)) d.a = Number(raw.a);
    if (has(raw.t_run)) d.t_run = Number(raw.t_run);

    const keys = Object.keys(d);

    // 特殊：仅输入 S + t_run → 按 1/3-1/3-1/3 最小能量法则分配
    if (keys.length === 2 && 'S' in d && 't_run' in d) {
      d.a = 9 * d.S / (2 * d.t_run * d.t_run);
      d.Vmax = 3 * d.S / (2 * d.t_run);
      return { ...d, derivedKeys: ['Vmax', 'a'], error: null };
    }

    if (keys.length < 3) {
      const hint = (keys.length === 2)
        ? `S + t_run 将自动优化分配，或补填第 3 项`
        : `请至少输入 2 个运动参数（已填 ${keys.length} 个）`;
      return { error: hint };
    }

    // 4 个全填了，直接使用
    if (keys.length === 4) {
      return { ...d, derivedKeys: [], error: null };
    }

    // Case 1: 已知 S, Vmax, a → 推导 t_run
    if ('S' in d && 'Vmax' in d && 'a' in d) {
      derivedKeys = ['t_run'];
      const S_min = d.Vmax * d.Vmax / d.a;
      if (d.S >= S_min) {
        d.t_run = d.Vmax / d.a + d.S / d.Vmax; // 梯形
      } else {
        d.t_run = 2 * Math.sqrt(d.S / d.a); // 三角形
      }
    }

    // Case 2: 已知 S, Vmax, t_run → 推导 a
    else if ('S' in d && 'Vmax' in d && 't_run' in d) {
      derivedKeys = ['a'];
      const denom = d.Vmax * d.t_run - d.S;
      if (denom > 1e-10) {
        d.a = d.Vmax * d.Vmax / denom;
      } else {
        d.a = 4 * d.S / (d.t_run * d.t_run);
      }
    }

    // Case 3: 已知 S, a, t_run → 推导 Vmax
    else if ('S' in d && 'a' in d && 't_run' in d) {
      derivedKeys = ['Vmax'];
      const disc = d.a * d.a * d.t_run * d.t_run - 4 * d.a * d.S;
      if (disc >= 0) {
        d.Vmax = (d.a * d.t_run - Math.sqrt(disc)) / 2;
        if (d.Vmax <= 0 || d.t_run < 2 * d.Vmax / d.a) {
          d.Vmax = Math.sqrt(d.a * d.S);
        }
      } else {
        d.Vmax = Math.sqrt(d.a * d.S);
      }
    }

    // Case 4: 已知 Vmax, a, t_run → 推导 S
    else if ('Vmax' in d && 'a' in d && 't_run' in d) {
      derivedKeys = ['S'];
      const t1 = d.Vmax / d.a;
      if (d.t_run >= 2 * t1) {
        d.S = d.Vmax * d.t_run - d.Vmax * d.Vmax / d.a;
      } else {
        d.S = d.a * d.t_run * d.t_run / 4;
      }
    }

    return { ...d, derivedKeys, error: null };
  },

  /**
   * 计算梯形运动曲线各段时间
   * @param {number} S  - 总行程 (m)
   * @param {number} Vmax - 最大速度 (m/s)
   * @param {number} a   - 加速度 (m/s²)
   * @param {number} tdwell - 暂停时间 (s)
   * @returns {{
   *   t1: number, t2: number, t3: number, t4: number,
   *   cycleTime: number, VmaxActual: number,
   *   isTriangle: boolean, S1: number, S2: number, S3: number
   * }}
   */
  calcMotionProfile(S, Vmax, a, tdwell) {
    let t1 = Vmax / a;
    const S1 = 0.5 * a * t1 * t1;
    const S3 = S1;

    let t2, t3, VmaxActual, isTriangle;

    if (S >= S1 + S3) {
      // 标准梯形曲线
      const S2 = S - S1 - S3;
      t2 = S2 / Vmax;
      t3 = t1;
      VmaxActual = Vmax;
      isTriangle = false;
    } else {
      // 三角形曲线（无法达到设定速度）
      isTriangle = true;
      const ta = Math.sqrt(S / a);
      t1 = ta;
      t2 = 0;
      t3 = ta;
      VmaxActual = a * ta;
    }

    const t4 = tdwell;
    const cycleTime = t1 + t2 + t3 + t4;

    return { t1, t2, t3, t4, cycleTime, VmaxActual, isTriangle, S1: 0.5*a*t1*t1, S2: S - 0.5*a*t1*t1 - 0.5*a*t3*t3, S3: 0.5*a*t3*t3, accel: a };
  },

  /**
   * 计算法向力、摩擦力、重力分量及推力
   * 法向力 = 重力法向分量 + 磁吸力
   * 摩擦力 = μ × 法向力
   * @param {number} totalMass - 总质量 = M + Mm (kg)
   * @param {number} a  - 加速度 (m/s²)
   * @param {number} mu - 摩擦系数
   * @param {number} thetaDeg - 倾斜角 (°)
   * @param {number} magAttraction - 磁吸力 (N)
   * @param {number} externalForce - 外部力 (N)
   * @returns {{
   *   Fa: number, Fc: number, Fd: number,
   *   normalForce: number, frictionForce: number, gravityForce: number, magAttraction: number
   * }}
   */
  calcThrustForces(totalMass, a, mu, thetaDeg, magAttraction, externalForce = 0) {
    const thetaRad = this.degToRad(thetaDeg);
    const gravNormal = totalMass * this.G * Math.cos(thetaRad);
    const normalForce = gravNormal + magAttraction;
    const frictionForce = mu * normalForce;
    const gravityForce = totalMass * this.G * Math.sin(thetaRad);

    // F_thrust = M·a + Ff + Fg + F_ext（a 带符号，自动处理加减速）
    const Fa = totalMass * a + frictionForce + gravityForce + externalForce;
    const Fc = frictionForce + gravityForce + externalForce;
    const Fd = totalMass * (-a) + frictionForce + gravityForce + externalForce;

    return { Fa, Fc, Fd, normalForce, frictionForce, gravityForce, magAttraction };
  },

  /**
   * 计算 RMS 推力
   * @param {{ Fa: number, Fc: number, Fd: number }} forces
   * @param {number} t1
   * @param {number} t2
   * @param {number} t3
   * @param {number} t4 - dwell time
   * @returns {number}
   */
  calcRMSThrust(forces, t1, t2, t3, t4) {
    const totalTime = t1 + t2 + t3 + t4;
    if (totalTime <= 0) return 0;
    const sumSq = (forces.Fa ** 2) * t1 + (forces.Fc ** 2) * t2 + (forces.Fd ** 2) * t3 + 0 * t4;
    return Math.sqrt(sumSq / totalTime);
  },

  /**
   * 计算峰值推力（绝对值最大）
   * @param {{ Fa: number, Fc: number, Fd: number }} forces
   * @returns {number}
   */
  calcPeakThrust(forces) {
    return Math.max(Math.abs(forces.Fa), Math.abs(forces.Fc), Math.abs(forces.Fd));
  },

  /**
   * 校核推力是否满足要求
   * @param {number} Frms - RMS 推力
   * @param {number} Fpeak - 峰值推力
   * @param {number} Fcont - 持续推力额定
   * @param {number} Fpeak_rated - 峰值推力额定
   * @returns {{
   *   rmsCheck: { pass: boolean, ratio: number },
   *   peakCheck: { pass: boolean, ratio: number }
   * }}
   */
  checkRatings(Frms, Fpeak, Fcont, Fpeak_rated) {
    return {
      rmsCheck: {
        pass: Frms <= Fcont,
        ratio: Fcont > 0 ? Frms / Fcont : 0,
      },
      peakCheck: {
        pass: Fpeak <= Fpeak_rated,
        ratio: Fpeak_rated > 0 ? Fpeak / Fpeak_rated : 0,
      },
    };
  },

  /**
   * 执行完整计算
   * @param {Object} params
   * @returns {Object} 计算结果
   */
  run(params) {
    const profile = this.calcMotionProfile(
      params.stroke,
      params.maxVelocity,
      params.acceleration,
      params.dwellTime
    );

    const totalMass = params.loadMass + params.primaryMass;
    const forces = this.calcThrustForces(totalMass, params.acceleration, params.frictionCoeff, params.inclineAngle, params.magAttraction, params.externalForce);

    const Frms = this.calcRMSThrust(forces, profile.t1, profile.t2, profile.t3, profile.t4);
    const Fpeak = this.calcPeakThrust(forces);

    const Fcont = params.forceConstant * params.contCurrent;
    const Fpeak_rated = params.forceConstant * params.peakCurrent;
    const _motorConfigured = params.forceConstant > 0 && (params.contCurrent > 0 || params.peakCurrent > 0);

    const checks = this.checkRatings(Frms, Fpeak, Fcont, Fpeak_rated);

    return {
      profile,
      forces,
      Frms,
      Fpeak,
      Fcont,
      Fpeak_rated,
      _motorConfigured,
      checks,
    };
  },
};
