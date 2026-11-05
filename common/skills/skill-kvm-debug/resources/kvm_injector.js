/**
 * KVM 焦点按键序列精密投递脚本 (kvm_injector.js)
 * 适用于 Playwright Agent 自动在 iframe / 页面画布控制流中触发高可靠大小写与符号输入。
 * 
 * 核心原理：
 * 采用 microsecond-level 时序模拟：KeyDown -> Hold 25ms -> KeyUp -> Wait 15ms -> CharGap 30ms。
 * 并能精确进行 Shift 分布式管理以输入大写字母与复杂修饰符。
 */

window.kvmInjectString = async function(str, delayMs = 30) {
  const textbox = document.getElementById('kvm_textbox');
  if (!textbox) {
    throw new Error("KVM target focus textbox '#kvm_textbox' not found.");
  }
  
  const charToKeycode = {
    'a': { code: 65, shift: false }, 'b': { code: 66, shift: false }, 'c': { code: 67, shift: false },
    'd': { code: 68, shift: false }, 'e': { code: 69, shift: false }, 'f': { code: 70, shift: false },
    'g': { code: 71, shift: false }, 'h': { code: 72, shift: false }, 'i': { code: 73, shift: false },
    'j': { code: 74, shift: false }, 'k': { code: 75, shift: false }, 'l': { code: 76, shift: false },
    'm': { code: 77, shift: false }, 'n': { code: 78, shift: false }, 'o': { code: 79, shift: false },
    'p': { code: 80, shift: false }, 'q': { code: 81, shift: false }, 'r': { code: 82, shift: false },
    's': { code: 83, shift: false }, 't': { code: 84, shift: false }, 'u': { code: 85, shift: false },
    'v': { code: 86, shift: false }, 'w': { code: 87, shift: false }, 'x': { code: 88, shift: false },
    'y': { code: 89, shift: false }, 'z': { code: 90, shift: false },
    
    'A': { code: 65, shift: true }, 'B': { code: 66, shift: true }, 'C': { code: 67, shift: true },
    'D': { code: 68, shift: true }, 'E': { code: 69, shift: true }, 'F': { code: 70, shift: true },
    'G': { code: 71, shift: true }, 'H': { code: 72, shift: true }, 'I': { code: 73, shift: true },
    'J': { code: 74, shift: true }, 'K': { code: 75, shift: true }, 'L': { code: 76, shift: true },
    'M': { code: 77, shift: true }, 'N': { code: 78, shift: true }, 'O': { code: 79, shift: true },
    'P': { code: 80, shift: true }, 'Q': { code: 81, shift: true }, 'R': { code: 82, shift: true },
    'S': { code: 83, shift: true }, 'T': { code: 84, shift: true }, 'U': { code: 85, shift: true },
    'V': { code: 86, shift: true }, 'W': { code: 87, shift: true }, 'X': { code: 88, shift: true },
    'Y': { code: 89, shift: true }, 'Z': { code: 90, shift: true },

    '1': { code: 49, shift: false }, '2': { code: 50, shift: false }, '3': { code: 51, shift: false },
    '4': { code: 52, shift: false }, '5': { code: 53, shift: false }, '6': { code: 54, shift: false },
    '7': { code: 55, shift: false }, '8': { code: 56, shift: false }, '9': { code: 57, shift: false },
    '0': { code: 48, shift: false },

    ' ': { code: 32, shift: false },
    '\n': { code: 13, shift: false },
    '\r': { code: 13, shift: false },
    '\t': { code: 9, shift: false },

    '-': { code: 189, shift: false }, '_': { code: 189, shift: true },
    '=': { code: 187, shift: false }, '+': { code: 187, shift: true },
    '[': { code: 219, shift: false }, '{': { code: 219, shift: true },
    ']': { code: 221, shift: false }, '}': { code: 221, shift: true },
    '\\': { code: 220, shift: false }, '|': { code: 220, shift: true },
    ';': { code: 186, shift: false }, ':': { code: 186, shift: true },
    '\'': { code: 222, shift: false }, '"': { code: 222, shift: true },
    '`': { code: 192, shift: false }, '~': { code: 192, shift: true },
    ',': { code: 188, shift: false }, '<': { code: 188, shift: true },
    '.': { code: 190, shift: false }, '>': { code: 190, shift: true },
    '/': { code: 191, shift: false }, '?': { code: 191, shift: true },

    '!': { code: 49, shift: true }, '@': { code: 50, shift: true }, '#': { code: 51, shift: true },
    '$': { code: 52, shift: true }, '%': { code: 53, shift: true }, '^': { code: 54, shift: true },
    '&': { code: 55, shift: true }, '*': { code: 56, shift: true }, '(': { code: 57, shift: true },
    ')': { code: 48, shift: true }
  };

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  const triggerKey = (keyCode, isPress) => {
    const dummyEvent = {
      keyCode: keyCode,
      keyLocation: 0,
      stopPropagation: () => {},
      preventDefault: () => {},
      altKey: false,
      ctrlKey: false,
      shiftKey: false
    };
    if (isPress) {
      textbox.onkeydown(dummyEvent);
    } else {
      textbox.onkeyup(dummyEvent);
    }
  };

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const mapping = charToKeycode[char];
    if (!mapping) continue;
    
    if (mapping.shift) {
      triggerKey(16, true); // Shift down
      await sleep(15);
    }
    
    triggerKey(mapping.code, true); // Keydown
    await sleep(25);
    
    triggerKey(mapping.code, false); // Keyup
    await sleep(15);
    
    if (mapping.shift) {
      triggerKey(16, false); // Shift up
      await sleep(15);
    }
    await sleep(delayMs);
  }
  return `Successfully injected: "${str}"`;
};
