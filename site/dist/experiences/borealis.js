/* ============================================================
   BOREALIS — WebGL2 aurora borealis curtains over a starfield.
   Cinematic hero intro for the home page.
   Falls back to a soft CSS gradient if WebGL2 is unavailable
   or the visitor prefers reduced motion.
   Usage: <canvas class="borealis" data-borealis></canvas>
   ============================================================ */
(function () {
  var canvas = document.querySelector('canvas[data-borealis]');
  if (!canvas) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = null;
  try { gl = canvas.getContext('webgl2', { antialias: true, alpha: false }); } catch (e) {}

  function paintFallback() {
    var c2 = canvas.getContext('2d');
    if (!c2) return;
    function draw() {
      var w = canvas.width, h = canvas.height;
      var g = c2.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0a2233');
      g.addColorStop(0.5, '#0d3a4a');
      g.addColorStop(1, '#091a25');
      c2.fillStyle = g; c2.fillRect(0, 0, w, h);
      var a = c2.createRadialGradient(w * 0.5, h * 0.2, 0, w * 0.5, h * 0.2, h * 0.9);
      a.addColorStop(0, 'rgba(60,220,180,0.28)');
      a.addColorStop(0.4, 'rgba(50,150,200,0.14)');
      a.addColorStop(1, 'rgba(0,0,0,0)');
      c2.fillStyle = a; c2.fillRect(0, 0, w, h);
    }
    resize(); draw();
    window.addEventListener('resize', function () { resize(); draw(); });
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || canvas.offsetWidth || window.innerWidth;
    var h = canvas.clientHeight || canvas.offsetHeight || 600;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }

  if (!gl || reduce) { paintFallback(); return; }

  var vs = '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs = '#version 300 es\n' +
    'precision highp float;out vec4 o;uniform vec2 R;uniform float T;\n' +
    'float h(vec2 x){return fract(sin(dot(x,vec2(12.9898,78.233)))*43758.5453);}\n' +
    'float n(vec2 x){vec2 i=floor(x),f=fract(x);float a=h(i),b=h(i+vec2(1,0)),c=h(i+vec2(0,1)),d=h(i+vec2(1,1));vec2 u=f*f*(3.-2.*f);return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;}\n' +
    'float fbm(vec2 x){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(x);x*=2.02;a*=.5;}return v;}\n' +
    'void main(){vec2 uv=gl_FragCoord.xy/R.xy;vec2 p=uv;p.x*=R.x/R.y;\n' +
    ' vec3 col=mix(vec3(.02,.06,.10),vec3(.03,.11,.16),uv.y);\n' +
    ' // starfield\n' +
    ' vec2 sg=floor(uv*vec2(R.x/2.2,R.y/2.2));float st=h(sg);\n' +
    ' float star=smoothstep(.991,1.,st)*(.5+.5*sin(T*2.+st*40.));col+=vec3(star)*(1.-uv.y*.5);\n' +
    ' // aurora curtains\n' +
    ' float aur=0.;\n' +
    ' for(int i=0;i<3;i++){float fi=float(i);\n' +
    '   float band=.55-fi*.12;\n' +
    '   float wv=fbm(vec2(uv.x*3.+fi*4.+T*.08,T*.10+fi))*.16;\n' +
    '   float d=abs(uv.y-(band+wv));\n' +
    '   float curtain=smoothstep(.16,.0,d);\n' +
    '   float ray=fbm(vec2(uv.x*14.+fi*10.,uv.y*4.-T*.5));\n' +
    '   aur+=curtain*ray*(.9-fi*.2);\n' +
    ' }\n' +
    ' vec3 aGreen=vec3(.15,.95,.62);vec3 aTeal=vec3(.15,.7,.95);vec3 aPink=vec3(.7,.35,.85);\n' +
    ' vec3 ac=mix(aGreen,aTeal,uv.x);ac=mix(ac,aPink,smoothstep(.6,1.,uv.y)*.5);\n' +
    ' col+=ac*aur*1.2;\n' +
    ' col+=ac*pow(aur,2.)*.5;\n' +
    ' col=pow(col,vec3(.85));\n' +
    ' o=vec4(col,1.);}';

  function compile(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('borealis shader', gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var v = compile(gl.VERTEX_SHADER, vs), f = compile(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) { paintFallback(); return; }
  var prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { paintFallback(); return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(prog, 'R'), uT = gl.getUniformLocation(prog, 'T');

  resize();
  window.addEventListener('resize', resize);
  var start = performance.now();
  var running = true;
  document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) loop(); });

  function loop() {
    if (!running) return;
    var t = (performance.now() - start) / 1000;
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.uniform1f(uT, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(loop);
  }
  loop();
})();
