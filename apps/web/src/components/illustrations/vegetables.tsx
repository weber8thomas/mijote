// Légumes : courges, racines, choux, feuilles.
import { Frame, Hi, Ink, LEAF, LEAF_DARK, LEAF_LIGHT, LG, RG, W, blob, leaf, leaflets, url, veins } from "./primitives";
import type { IllustrationProps } from "./primitives";

export function Courge({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="courge-a" c={["#f7e0b0", "#edc68c", "#d9a35e"]} x2={1} y2={0.3} />
      </defs>
      <W d="M55 22C51 25 50 34 50 46C50 57 44 63 39 72C32 87 40 106 60 106C80 106 88 87 81 72C76 63 70 57 70 46C70 34 69 25 65 22C62 20 58 20 55 22Z" f={url("courge-a")} o={0.9} />
      <W d="M41 82C44 72 56 69 65 71C77 73 84 84 80 94C74 104 50 104 44 96C41 92 40 86 41 82Z" f="#eaa04f" o={0.45} />
      <W d="M66 28C69 40 68 54 74 63C82 74 88 89 78 100C72 106 63 106 58 105C72 100 80 88 74 76C68 66 64 54 64 40C64 34 65 30 66 28Z" f="#c88a44" o={0.5} />
      <Hi d="M56 32C54 42 54 54 50 63C47 69 45 75 45 82C48 74 53 68 56 62C58 54 58 42 58 32Z" o={0.65} />
      <W d="M56 23C56 17 57 13 59 9C61 7 64 8 65 10C63 14 63 19 64 23C61 25 58 25 56 23Z" f="#8a7b4a" o={0.9} />
      <W d="M58 102C59 100 62 100 63 102C63 104 59 105 58 102Z" f="#8d5f2f" o={0.7} />
      <Ink>
        <path d="M70 47C70 57 77 63 82 72M38 74C33 86 38 100 50 104" />
        <path d="M58 11C58 16 58 20 58 24" />
        <path d="M63 12C70 6 77 10 74 15C72 18 68 16 70 13" />
      </Ink>
      <Ink o={0.3} w={1}>
        <path d="M51 80C50 88 53 96 57 101M69 80C71 88 69 96 65 101" />
      </Ink>
    </Frame>
  );
}

export function Potiron({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="potiron-a" c={["#f6bd6c", "#e48f3e", "#c96c2b"]} cx={0.4} cy={0.3} r={0.8} />
      </defs>
      <W d="M42 44C25 44 14 58 14 71C14 87 27 98 43 98C51 98 54 90 52 70C51 54 49 44 42 44Z" f={url("potiron-a")} o={0.82} />
      <W d="M78 44C95 44 106 58 106 71C106 87 93 98 77 98C69 98 66 90 68 70C69 54 71 44 78 44Z" f={url("potiron-a")} o={0.82} />
      <W d="M60 40C46 40 39 54 39 70C39 88 48 101 60 101C72 101 81 88 81 70C81 54 74 40 60 40Z" f={url("potiron-a")} o={0.85} />
      <W d="M86 50C99 56 104 72 100 84C96 94 86 98 80 96C92 88 95 70 86 50Z" f="#b25a24" o={0.45} />
      <W d="M70 46C78 56 80 80 72 97C78 92 83 80 81 68C80 58 76 50 70 46Z" f="#b85f26" o={0.45} />
      <Hi d="M53 48C47 56 46 66 47 77C50 66 52 57 57 49Z" o={0.55} />
      <Hi d="M30 52C24 58 21 66 22 75C25 66 28 58 33 53Z" o={0.4} />
      <W d="M57 43C56 36 55 31 51 27C55 23 61 23 64 25C64 31 63 37 64 43C62 45 59 45 57 43Z" f="#7f7c47" o={0.9} />
      <W d="M51 27C55 23 61 23 64 25C60 28 55 29 51 27Z" f="#c7b680" o={0.8} />
      <Ink>
        <path d="M51 46C46 58 46 82 50 96" />
        <path d="M69 46C74 58 74 82 70 96" />
        <path d="M65 30C72 23 81 25 81 31C81 36 75 37 74 33C74 30 77 30 78 32" />
        <path d="M58 42C57 36 56 31 53 28" />
      </Ink>
      <Ink o={0.4}>
        <path d="M22 90C33 99 48 101 60 101C73 101 87 99 98 90" />
      </Ink>
    </Frame>
  );
}

const CAROTTE_FANES = leaflets(77, 44, 78, 14, 5, 9, 2.4) + leaflets(80, 45, 104, 20, 5, 9, 2.4) + leaflets(82, 48, 110, 42, 4, 8, 2.2);
export function Carotte({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="carotte-a" c={["#f7b166", "#e6863b", "#c8682a"]} x2={1} y2={1} />
      </defs>
      <W d={CAROTTE_FANES} f={LEAF} o={0.75} />
      <W d="M24 105C31 93 45 76 58 58C62 52 66 46 70 42C75 37 83 39 86 45C88 50 87 55 83 59C68 73 46 92 24 105Z" f={url("carotte-a")} o={0.9} />
      <W d="M31 101C47 91 66 74 80 61C84 57 86 53 86 49C88 55 86 61 81 66C65 80 47 94 31 101Z" f="#bd5d26" o={0.5} />
      <Hi d="M35 92C45 80 56 64 68 50C66 57 58 68 48 80C43 86 39 90 35 92Z" o={0.5} />
      <Ink c={LEAF_DARK} o={0.75} w={1.1}>
        <path d="M77 44C76 33 77 24 78 14M80 45C86 35 94 27 104 20M82 48C92 44 101 42 110 42" />
      </Ink>
      <Ink>
        <path d="M37 87C39 89 41 90 43 91M47 75C49 77 51 78 53 79M57 63C59 65 61 66 63 67M65 53C67 55 69 56 71 57" />
        <path d="M28 103C46 92 66 75 82 60" />
      </Ink>
    </Frame>
  );
}

export function Poireau({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="poireau-a" c={[["#f4efdf", 0], ["#eef0d2", 0.45], ["#bccf8c", 0.72], ["#8fae66", 1]]} x1={0} y1={1} x2={1} y2={0} />
      </defs>
      <W d="M66 50C66 37 68 24 74 10C78 22 79 36 75 53Z" f={LEAF_DARK} o={0.8} />
      <W d="M68 51C74 39 84 27 99 15C95 29 87 43 77 56Z" f="#6f8f50" o={0.78} />
      <W d="M72 55C82 45 94 35 110 29C102 41 90 53 79 61Z" f={LEAF} o={0.8} />
      <W d="M18 92C16 100 22 107 30 104C46 90 62 74 78 58L67 47C50 62 34 78 18 92Z" f={url("poireau-a")} o={0.92} />
      <W d="M25 103C41 90 58 74 76 60L78 58C62 75 47 91 31 104C29 105 27 104 25 103Z" f="#9fb37a" o={0.45} />
      <W d="M18 93C16 100 22 107 30 104C25 104 20 100 18 93Z" f="#d9cfae" o={0.6} />
      <Ink>
        <path d="M20 101C15 104 11 104 8 107M22 104C19 109 16 112 12 114M26 105C25 109 26 113 23 116M18 98C13 98 10 100 7 100" />
        <path d="M70 52C70 38 71 27 74 14M74 55C82 45 90 35 98 19" />
      </Ink>
      <Ink o={0.35} w={1}>
        <path d="M25 96C39 84 54 70 70 54M22 93C35 82 49 68 64 52" />
      </Ink>
    </Frame>
  );
}

export function Chou({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="chou-a" c={["#a9bf7f", "#7d9a5b"]} x2={0.4} />
        <RG id="chou-b" c={["#dae4b0", "#adc282", "#7f9c5d"]} cx={0.42} cy={0.35} />
      </defs>
      <W d="M52 30C30 28 14 46 16 68C18 86 32 100 50 102C44 90 40 74 42 58C43 46 46 36 52 30Z" f={url("chou-a")} o={0.78} />
      <W d="M68 30C90 28 106 46 104 68C102 86 88 100 70 102C76 90 80 74 78 58C77 46 74 36 68 30Z" f={url("chou-a")} o={0.78} />
      <W d="M60 30C42 30 32 48 32 66C32 86 44 100 60 100C76 100 88 86 88 66C88 48 78 30 60 30Z" f={url("chou-b")} o={0.88} />
      <W d="M76 40C86 50 90 66 86 82C82 92 74 98 66 100C78 90 84 74 80 56C79 50 78 44 76 40Z" f={LEAF_DARK} o={0.45} />
      <W d="M62 33C77 35 89 50 89 68C89 86 77 99 62 101C70 89 74 75 72 60C71 49 67 40 62 33Z" f={LEAF} o={0.6} />
      <Hi d="M48 40C42 48 40 58 41 66C45 58 48 50 54 44Z" o={0.55} />
      <Ink o={0.5}>
        <path d="M52 98C48 82 48 60 56 36M51 80C46 74 42 68 40 60M50 66C46 60 44 54 44 48M51 84C56 76 62 70 70 66M50 70C55 62 60 56 66 52" />
        <path d="M22 70C28 64 34 59 41 56M98 70C92 64 86 59 80 56M24 84C30 82 36 80 40 76M96 84C90 82 85 80 82 76" />
      </Ink>
      <Ink o={0.6}>
        <path d="M62 34C76 40 86 54 86 70C86 84 78 96 64 100" />
      </Ink>
    </Frame>
  );
}

const CF_BACK = [blob(44, 48, 13, 12, 1), blob(61, 41, 14, 13, 2), blob(78, 49, 13, 12, 3), blob(34, 63, 11, 11, 4), blob(88, 64, 11, 11, 5)].join("");
const CF_FRONT = [blob(51, 62, 13, 12, 6), blob(69, 61, 13, 12, 7), blob(60, 75, 13, 11, 8), blob(43, 76, 10, 9, 9), blob(79, 76, 10, 9, 10)].join("");
const CF_SHADE = [blob(48, 52, 8, 7, 1), blob(66, 45, 9, 8, 2), blob(82, 53, 8, 7, 3), blob(56, 66, 8, 7, 6), blob(73, 65, 8, 7, 7), blob(64, 78, 8, 6, 8)].join("");
export function ChouFleur({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <W d={CF_BACK} f="#ecdcb6" o={0.88} />
      <W d={CF_FRONT} f="#f5ebcf" o={0.9} />
      <W d={CF_SHADE} f="#d3bc8c" o={0.35} />
      <Hi d={[blob(56, 37, 5, 3.5, 1), blob(45, 57, 5, 3.5, 2), blob(63, 55, 5, 3.5, 3)].join("")} o={0.65} />
      <W d="M18 68C22 88 38 104 58 107C52 96 45 86 41 77C35 72 26 69 18 68Z" f={LEAF} o={0.82} />
      <W d="M102 68C98 88 82 104 62 107C68 96 75 86 79 77C85 72 94 69 102 68Z" f={LEAF} o={0.82} />
      <W d="M42 84C49 95 55 104 60 109C65 104 71 95 78 84C68 89 52 89 42 84Z" f={LEAF_LIGHT} o={0.85} />
      <Ink o={0.35} w={2}>
        <path d="M40 44h.1M43 46h.1M41 48h.1M58 37h.1M61 38h.1M59 40h.1M74 45h.1M77 46h.1M48 59h.1M51 60h.1M66 58h.1M69 59h.1M67 61h.1M56 72h.1M59 73h.1M32 61h.1M86 61h.1M88 63h.1M44 75h.1M78 75h.1" />
      </Ink>
      <Ink o={0.6}>
        <path d="M22 72C30 84 42 96 56 105M98 72C90 84 78 96 64 105M60 108C60 100 60 92 60 86" />
      </Ink>
    </Frame>
  );
}

const BR_BACK = [blob(40, 44, 13, 12, 1), blob(57, 33, 14, 13, 2), blob(74, 38, 13, 12, 3), blob(86, 53, 12, 11, 4), blob(31, 59, 11, 10, 5)].join("");
const BR_FRONT = [blob(49, 54, 13, 12, 6), blob(67, 53, 13, 12, 7), blob(80, 66, 11, 10, 8), blob(38, 69, 10, 9, 9), blob(58, 67, 10, 8, 10)].join("");
const BR_DOTS = [blob(50, 30, 3.5, 3, 1), blob(36, 40, 3, 2.5, 2), blob(70, 34, 3, 2.5, 3), blob(44, 50, 3.5, 3, 4), blob(63, 49, 3.5, 3, 5), blob(82, 49, 3, 2.5, 6)].join("");
export function Brocoli({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="brocoli-a" c={["#cbd8a2", "#a9bf7f", "#8aa564"]} x2={1} y2={0} />
      </defs>
      <W d="M48 66C52 80 50 94 45 105C54 110 67 110 75 105C70 94 68 80 72 66Z" f={url("brocoli-a")} o={0.9} />
      <W d="M64 70C66 82 66 94 71 104C73 104 74 104 75 105C70 94 68 80 71 68Z" f={LEAF} o={0.5} />
      <W d={BR_BACK} f={LEAF_DARK} o={0.85} />
      <W d={BR_FRONT} f="#7a9858" o={0.85} />
      <W d={BR_DOTS} f={LEAF_LIGHT} o={0.7} soft />
      <Ink o={0.55}>
        <path d="M60 104C60 93 60 83 58 73M52 86C48 80 45 76 41 72M66 84C70 78 74 74 79 70" />
      </Ink>
      <Ink o={0.35} w={2}>
        <path d="M37 40h.1M40 41h.1M54 30h.1M57 31h.1M55 33h.1M72 35h.1M75 36h.1M46 51h.1M49 52h.1M65 50h.1M68 51h.1M66 53h.1M84 51h.1M78 63h.1M80 65h.1M36 66h.1M56 64h.1" />
      </Ink>
    </Frame>
  );
}

export function Epinard({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="epinard-a" c={["#7d9a5b", "#567640"]} x2={0.3} />
      </defs>
      <Ink c="#8aa564" o={0.95} w={2.6}>
        <path d="M60 108C58 98 54 88 50 78M60 108C60 96 60 86 61 74M60 108C64 98 67 89 70 80" />
      </Ink>
      <W d={leaf(50, 78, 18, 30, 15, 0, true)} f={url("epinard-a")} o={0.82} />
      <W d={leaf(70, 80, 103, 37, 14, 0, true)} f={url("epinard-a")} o={0.82} />
      <W d={leaf(61, 74, 62, 14, 17, 0, true)} f="#6c8a4e" o={0.85} />
      <W d={leaf(64, 72, 64, 22, 8, 3)} f={LEAF_DARK} o={0.35} />
      <Hi d={leaf(54, 66, 48, 34, 4, -6)} o={0.35} />
      <Ink o={0.55} w={1}>
        <path d={veins(50, 78, 18, 30, 4, 15) + veins(70, 80, 103, 37, 4, 14) + veins(61, 74, 62, 14, 4, 17)} />
      </Ink>
    </Frame>
  );
}

export function Betterave({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="betterave-a" c={["#b4607f", "#8a3b5c", "#682843"]} cx={0.36} cy={0.35} />
      </defs>
      <Ink c="#9a4466" o={0.9} w={2.4}>
        <path d="M58 56C54 48 50 42 48 36M60 56C61 46 63 38 64 30M62 56C67 49 72 43 77 37" />
      </Ink>
      <W d={leaf(48, 37, 26, 10, 10, 2)} f={LEAF} o={0.8} />
      <W d={leaf(64, 31, 70, 4, 10, -1)} f={LEAF_DARK} o={0.82} />
      <W d={leaf(77, 38, 101, 16, 10, -2)} f={LEAF} o={0.8} />
      <Ink c="#8a3b5c" o={0.6} w={1}>
        <path d={veins(48, 37, 26, 10, 3, 10) + veins(64, 31, 70, 4, 3, 10) + veins(77, 38, 101, 16, 3, 10)} />
      </Ink>
      <W d="M60 54C44 54 34 66 35 80C36 93 46 101 56 104C59 108 61 112 66 117C65 111 65 107 66 103C78 99 86 90 85 78C84 64 74 54 60 54Z" f={url("betterave-a")} o={0.9} />
      <W d="M74 60C84 68 86 84 78 94C72 100 66 103 62 103C74 96 80 84 76 70C76 66 75 63 74 60Z" f="#5a2039" o={0.45} />
      <Hi d="M46 64C41 70 40 78 42 84C44 77 46 71 51 66Z" o={0.45} />
      <Ink o={0.45} w={1}>
        <path d="M41 74C46 72 51 74 55 72M66 88C70 87 73 88 76 86M66 110C69 110 71 109 73 108" />
      </Ink>
    </Frame>
  );
}

const PANAIS_LEAVES = leaflets(38, 36, 22, 12, 3, 8, 3) + leaflets(42, 34, 46, 8, 3, 8, 3);
export function Panais({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="panais-a" c={["#f6eed8", "#e4d6ab", "#c8b383"]} x1={1} y1={0} x2={0} y2={1} />
      </defs>
      <Ink c={LEAF} o={0.85} w={2}>
        <path d="M38 38C33 30 28 22 22 12M42 36C43 26 45 18 46 8" />
      </Ink>
      <W d={PANAIS_LEAVES} f={LEAF} o={0.78} />
      <W d="M32 42C33 33 46 30 53 36C66 50 84 76 99 105C80 87 56 69 40 56C34 51 31 47 32 42Z" f={url("panais-a")} o={0.92} />
      <W d="M40 56C56 69 80 87 99 105C86 92 64 70 50 56C45 51 40 52 40 56Z" f="#b9a274" o={0.5} />
      <W d="M33 40C36 34 46 33 51 37C46 39 38 40 33 40Z" f="#cdb98a" o={0.7} />
      <Hi d="M44 38C54 46 64 58 74 72C66 64 56 54 44 44Z" o={0.55} />
      <Ink>
        <path d="M44 50C46 49 48 48 50 46M56 60C58 59 60 58 61 56M68 72C70 71 71 70 72 68M80 86C81 85 82 84 83 83" />
        <path d="M40 56C56 69 78 86 99 105" />
      </Ink>
    </Frame>
  );
}

export function PatateDouce({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="patate-douce-a" c={["#d68670", "#b45a48", "#8c3f36"]} x1={0.2} y1={0} x2={0.4} y2={1} />
        <RG id="patate-douce-b" c={["#f7c27a", "#f0a050", "#e08a3c"]} cx={0.45} cy={0.4} />
      </defs>
      <W d="M12 66C18 52 38 40 60 36C78 33 96 34 106 42C109 48 100 58 84 64C64 72 40 76 24 74C17 73 13 70 12 66Z" f={url("patate-douce-a")} o={0.9} />
      <W d="M20 72C40 72 64 68 84 60C96 55 104 50 107 44C108 52 98 60 84 66C64 74 40 78 20 72Z" f="#7a332c" o={0.45} />
      <Hi d="M30 56C44 46 62 42 80 41C66 44 48 48 32 58Z" o={0.45} />
      <W d={blob(76, 88, 22, 14, 2, 0.04, -0.2)} f="#a64e40" o={0.88} />
      <W d={blob(76, 87, 18.5, 11, 3, 0.04, -0.2)} f={url("patate-douce-b")} o={0.95} />
      <Hi d={blob(70, 84, 8, 4, 1, 0.05, -0.2)} o={0.4} />
      <Ink>
        <path d="M12 66C8 68 6 69 3 71M106 42C110 40 112 38 115 37" />
        <path d="M40 54c3 0 5-1 7-2M62 46c3 0 5-1 7-2M86 46c2 0 4-1 5-2M50 66c3 0 5-1 6-2" />
      </Ink>
      <Ink o={0.35} w={1}>
        <path d="M66 86C70 83 76 82 82 84" />
      </Ink>
    </Frame>
  );
}

export function Champignon({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="champignon-a" c={["#ead9bb", "#d6bf9c", "#b39470"]} cx={0.4} cy={0.3} r={0.8} />
        <LG id="champignon-b" c={["#f5ecdb", "#dcc9a6"]} x2={1} y2={0} />
      </defs>
      <g transform="translate(-6 0)">
        <W d="M48 66C48 80 46 94 44 102C52 107 68 107 76 102C74 94 72 80 72 66Z" f={url("champignon-b")} o={0.92} />
        <W d="M66 68C68 80 69 92 72 103C74 103 75 103 76 102C74 94 72 80 72 66Z" f="#c4ad86" o={0.5} />
        <W d="M22 62C34 70 86 70 98 62C90 72 74 75 60 75C46 75 30 72 22 62Z" f="#c7ad85" o={0.85} />
        <W d="M18 62C18 40 38 24 60 24C82 24 102 40 102 62C94 67 80 69 60 69C40 69 26 67 18 62Z" f={url("champignon-a")} o={0.9} />
        <W d="M82 32C96 42 102 54 101 62C94 66 84 68 74 69C88 62 92 48 82 32Z" f="#9c7d58" o={0.4} />
        <Hi d="M34 40C40 32 50 28 58 28C50 32 42 38 38 46Z" o={0.6} />
        <Ink>
          <path d="M18 62C30 68 90 68 102 62" />
          <path d="M48 70C48 82 46 94 44 102M72 70C72 82 74 94 76 102" />
        </Ink>
        <Ink o={0.35} w={1}>
          <path d="M34 67L38 71M46 69L48 73M60 70L60 74M72 69L71 73M84 67L81 71" />
          <path d="M50 40c1 0 2 0 2 1M66 36c1 0 2 0 2 1M76 46c1 0 2 0 2 1M58 52c1 0 2 0 2 1" />
        </Ink>
      </g>
      <W d="M92 92C92 97 91 103 90 108C94 111 100 111 103 108C102 103 101 97 101 92Z" f="#efe4cf" o={0.92} />
      <W d="M81 92C81 82 88 76 96 76C104 76 111 82 111 92C105 95 87 95 81 92Z" f={url("champignon-a")} o={0.9} />
      <Hi d="M88 82C91 79 94 78 97 78C94 80 92 82 90 85Z" o={0.55} />
      <Ink>
        <path d="M81 92C87 95 105 95 111 92M92 95C92 100 91 104 90 108" />
      </Ink>
    </Frame>
  );
}

export function PommeDeTerre({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="pomme-de-terre-a" c={["#ead09b", "#d5ae6e", "#b48a52"]} cx={0.38} cy={0.32} />
      </defs>
      <W d="M18 62C16 46 33 34 53 35C71 35 92 41 96 57C100 73 88 89 64 91C40 93 20 80 18 62Z" f={url("pomme-de-terre-a")} o={0.9} />
      <W d="M86 48C96 58 96 74 86 84C78 90 66 92 56 91C74 86 88 74 86 48Z" f="#a17644" o={0.42} />
      <Hi d="M30 50C38 42 50 39 62 40C50 43 40 48 34 56Z" o={0.55} />
      <W d={blob(86, 90, 17, 12.5, 2, 0.08, -0.25)} f={url("pomme-de-terre-a")} o={0.92} />
      <W d={blob(90, 94, 11, 7, 3, 0.08, -0.25)} f="#a17644" o={0.4} />
      <Ink>
        <path d="M38 52l3-1M60 46l3 0M48 72l3-1M74 64l3 0M82 86l3-1M92 96l2 0" />
      </Ink>
      <Ink o={0.4} w={1.6}>
        <path d="M30 64h.1M56 58h.1M66 78h.1M80 52h.1M44 82h.1M96 86h.1" />
      </Ink>
    </Frame>
  );
}

export function Oignon({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="oignon-a" c={["#efc77c", "#d99a44", "#b26d31"]} cx={0.38} cy={0.42} />
      </defs>
      <W d="M57 26C57 18 60 11 65 6C65 13 63 20 63 26Z" f="#c08848" o={0.85} />
      <W d="M60 22C58 30 54 36 46 42C32 52 26 64 30 78C34 92 46 100 60 100C74 100 86 92 90 78C94 64 88 52 74 42C66 36 62 30 60 22Z" f={url("oignon-a")} o={0.9} />
      <W d="M72 44C84 54 90 66 87 80C84 90 74 98 62 100C76 92 84 78 80 62C78 54 76 48 72 44Z" f="#9e5a26" o={0.42} />
      <Hi d="M48 46C40 54 36 64 37 74C40 64 44 56 52 48Z" o={0.55} />
      <W d="M54 99C57 102 63 102 66 99C63 98 57 98 54 99Z" f="#9a7444" o={0.75} />
      <Ink>
        <path d="M60 24C50 40 36 56 40 80C42 90 50 97 58 100M61 24C70 40 84 56 80 80C78 90 70 97 62 100" />
        <path d="M60 101C58 104 56 106 52 108M60 101C60 105 61 108 60 111M61 101C64 104 66 106 70 107M59 101C56 103 52 104 48 104" />
      </Ink>
      <Ink o={0.35} w={1}>
        <path d="M60 26C56 46 54 70 58 98M46 44C38 56 34 70 40 88M75 44C83 56 86 70 80 88" />
      </Ink>
    </Frame>
  );
}

export function Celeri({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="celeri-a" c={["#eee8cc", "#d6cda0", "#aea374"]} cx={0.38} cy={0.35} />
      </defs>
      <Ink c="#9fb57a" o={1} w={3.4}>
        <path d="M50 46C46 38 42 32 36 26M58 44C58 36 58 28 59 20M68 46C72 38 77 32 84 27" />
      </Ink>
      <W d={leaf(36, 27, 18, 16, 8, 1, true) + leaf(36, 27, 30, 8, 7, -1, true)} f={LEAF} o={0.82} />
      <W d={leaf(59, 21, 50, 4, 7, 1, true) + leaf(59, 21, 70, 5, 7, -1, true)} f={LEAF_DARK} o={0.8} />
      <W d={leaf(84, 28, 102, 18, 8, -1, true) + leaf(84, 28, 92, 10, 7, 1, true)} f={LEAF} o={0.82} />
      <Ink o={0.45} w={0.9}>
        <path d="M36 27L20 17M36 27L31 10M59 21L51 6M59 21L69 7M84 28L100 19M84 28L91 12" />
      </Ink>
      <W d={blob(60, 94, 26, 9, 1, 0.12)} f="#9c8a62" o={0.55} />
      <W d="M30 62C28 50 40 43 52 45C60 42 76 42 85 49C95 57 95 72 89 82C85 91 74 97 60 97C45 97 32 89 30 78C29 72 29 67 30 62Z" f={url("celeri-a")} o={0.92} />
      <W d="M84 52C94 62 93 76 86 85C80 91 72 95 62 96C78 88 88 74 84 52Z" f="#978b5c" o={0.42} />
      <Hi d="M39 55C45 49 52 47 60 47C52 51 46 55 42 61Z" o={0.6} />
      <W d="M47 47C51 45 56 44 59 45C63 44 68 45 72 48C66 50 53 50 47 47Z" f="#a9bd80" o={0.65} />
      <Ink>
        <path d="M40 91C37 95 33 96 30 100C28 102 29 104 27 106M52 96C51 100 49 103 51 107M66 97C66 101 69 104 67 108M78 92C81 96 85 97 87 101M34 85C30 87 27 87 24 90" />
        <path d="M30 100c-2 0-4 1-5 3M51 103c-2 1-3 3-3 5M67 104c2 1 3 3 3 5M84 98c2 0 3 1 4 3" strokeWidth={0.8} />
      </Ink>
      <Ink o={0.35} w={1}>
        <path d="M44 66l3-1M68 60l3 0M56 82l3-1M78 76l2 0M38 76l2-1" />
      </Ink>
      <Ink o={0.3} w={1.8}>
        <path d="M50 60h.1M62 70h.1M74 66h.1M46 82h.1M68 86h.1M82 60h.1" />
      </Ink>
    </Frame>
  );
}

export function Navet({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="navet-a" c={["#a8749c", "#c49abd", "#e8d9e0"]} />
      </defs>
      <W d={leaf(52, 40, 32, 10, 9, 2)} f={LEAF} o={0.8} />
      <W d={leaf(60, 38, 62, 5, 10)} f={LEAF_DARK} o={0.82} />
      <W d={leaf(68, 40, 90, 12, 9, -2)} f={LEAF} o={0.8} />
      <Ink o={0.5} w={1}>
        <path d={veins(52, 40, 32, 10, 3, 9) + veins(60, 38, 62, 5, 3, 10) + veins(68, 40, 90, 12, 3, 9)} />
      </Ink>
      <W d="M60 38C42 38 30 52 30 68C30 84 42 95 56 99C58 105 60 111 62 117C63 111 64 105 66 99C80 95 90 84 90 68C90 52 78 38 60 38Z" f="#f4efe6" o={0.95} />
      <W d="M60 38C42 38 30 51 30 63C40 69 50 62 60 64C70 66 80 69 90 63C90 51 78 38 60 38Z" f={url("navet-a")} o={0.82} soft />
      <W d="M60 38C46 38 36 46 33 56C42 52 52 48 60 48C68 48 78 52 87 56C84 46 74 38 60 38Z" f="#8e5683" o={0.5} />
      <W d="M80 70C86 80 84 90 76 96C70 99 64 100 62 100C76 94 82 84 80 70Z" f="#d6cbbd" o={0.6} />
      <Ink o={0.55}>
        <path d="M30 68C30 84 42 95 56 99M90 68C90 84 80 95 66 99" />
        <path d="M62 112c2 0 3 1 4 2M60 104c-2 0-3 1-4 2" />
      </Ink>
    </Frame>
  );
}

export function Poivron({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="poivron-a" c={["#e2836a", "#c8553d", "#9e3a2a"]} x2={1} y2={0.3} />
      </defs>
      <W d="M34 40C26 46 24 62 28 78C32 94 40 104 50 102C54 101 56 98 60 98C64 98 66 102 72 102C82 102 90 92 94 76C98 60 94 46 86 40C78 34 68 38 60 38C52 38 42 34 34 40Z" f={url("poivron-a")} o={0.9} />
      <W d="M48 42C44 56 44 84 50 101C52 102 54 100 56 99C52 84 50 60 52 42Z" f="#9a3426" o={0.4} />
      <W d="M70 42C74 58 74 84 70 101C72 102 74 102 76 101C80 84 80 58 74 41Z" f="#9a3426" o={0.42} />
      <W d="M86 42C94 50 96 64 92 80C88 92 82 100 76 101C86 92 92 72 86 42Z" f="#85301f" o={0.45} />
      <Hi d="M38 50C35 60 35 72 38 84C40 72 40 60 43 50Z" o={0.7} />
      <Hi d="M60 48C58 54 58 62 59 68C61 62 62 54 63 48Z" o={0.5} />
      <W d="M50 42C53 35 66 34 70 41C65 44 56 44 50 42Z" f={LEAF_DARK} o={0.88} />
      <W d="M58 40C58 31 61 24 68 19C71 20 72 23 70 26C66 29 64 33 64 40Z" f="#6f8f50" o={0.9} />
      <Ink>
        <path d="M50 42C56 45 64 45 70 41M61 38C61 31 63 26 68 21" />
        <path d="M50 102C54 101 56 98 60 98C64 98 66 102 72 102" />
      </Ink>
      <Ink o={0.35} w={1}>
        <path d="M51 46C48 62 48 82 52 98M70 46C73 62 73 82 70 98" />
      </Ink>
    </Frame>
  );
}

const TOMATE_SEPALS = [0, 1, 2, 3, 4, 5].map((i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 3 + 0.3;
  return leaf(60, 40, 60 + Math.cos(a) * 15, 40 + Math.sin(a) * 9, 2.6, i % 2 ? 1 : -1);
}).join("");
export function Tomate({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="tomate-a" c={["#e8866a", "#cb5840", "#a13a2a"]} cx={0.38} cy={0.36} />
      </defs>
      <W d="M60 38C40 34 20 48 20 70C20 90 38 104 60 104C82 104 100 90 100 70C100 48 80 34 60 38Z" f={url("tomate-a")} o={0.9} />
      <W d="M86 48C98 60 98 80 88 92C80 100 70 104 60 104C78 98 92 84 86 48Z" f="#8a2e22" o={0.42} />
      <Hi d="M34 54C38 46 46 42 52 42C46 46 40 52 37 60Z" o={0.75} />
      <Hi d="M30 66C30 72 31 76 33 80C34 74 34 70 33 64Z" o={0.4} />
      <W d={TOMATE_SEPALS} f="#6c8c4c" o={0.9} />
      <Ink c="#5f7d45" o={0.95} w={3}>
        <path d="M60 40C60 34 61 29 65 25" />
      </Ink>
      <Ink o={0.4} w={1}>
        <path d="M48 44C40 54 37 68 40 84M74 44C82 54 85 68 82 84" />
      </Ink>
    </Frame>
  );
}
