/**
 * Sistema di Auto-Correzione Errori di Sintassi
 * Rileva e corregge automaticamente errori comuni nei plugin
 */

import fs from 'fs';
import path from 'path';

/**
 * Pattern di errori comuni e le loro correzioni
 */
const ERROR_PATTERNS = {
    // Parentesi mancanti nella chiamata di funzione
    MISSING_CLOSING_PAREN: {
        pattern: /(\w+\([^)]*)\s*$/gm,
        description: 'Parentesi di chiusura mancante',
        fix: (match) => match.trim() + ')'
    },
    
    // Virgole mancanti in oggetti
    MISSING_COMMA_IN_OBJECT: {
        pattern: /(\w+:\s*['"][^'"]*['"])\s*\n\s*(\w+:)/gm,
        description: 'Virgola mancante in oggetto',
        fix: (match, p1, p2) => `${p1},\n    ${p2}`
    },
    
    // Virgole mancanti dopo proprietà oggetto
    MISSING_COMMA_AFTER_PROPERTY: {
        pattern: /(\w+:\s*[^,\n}]+)\s*\n\s*(\w+\s*:)/gm,
        description: 'Virgola mancante dopo proprietà',
        fix: (match, p1, p2) => `${p1},\n    ${p2}`
    },
    
    // Export malformato
    MALFORMED_EXPORT: {
        pattern: /export\s+{\s*(\w+)\s*}\s*$/gm,
        description: 'Export default mancante',
        fix: (match, p1) => `export default { ${p1} }`
    },
    
    // Import senza .js
    MISSING_JS_EXTENSION: {
        pattern: /import\s+.*from\s+['"]([^'"]+)(?<!\.js)['"];?/gm,
        description: 'Estensione .js mancante in import',
        fix: (match, importPath) => {
            if (importPath.startsWith('./') || importPath.startsWith('../')) {
                return match.replace(importPath, importPath + '.js');
            }
            return match;
        }
    },
    
    // Punti e virgola mancanti
    MISSING_SEMICOLON: {
        pattern: /(\w+\([^)]*\))\s*\n/gm,
        description: 'Punto e virgola mancante',
        fix: (match, p1) => `${p1};\n`
    },
    
    // Bracket quadre non chiuse
    MISSING_CLOSING_BRACKET: {
        pattern: /(\[[^\]]*)\s*$/gm,
        description: 'Parentesi quadra di chiusura mancante',
        fix: (match) => match.trim() + ']'
    },
    
    // Graffe non chiuse nei blocchi funzione
    MISSING_CLOSING_BRACE_FUNCTION: {
        pattern: /(function\s*\([^)]*\)\s*{[^}]*)\s*$/gm,
        description: 'Graffa di chiusura mancante in funzione',
        fix: (match) => match.trim() + '\n    }'
    },
    
    // Parentesi di chiamata funzione incomplete
    INCOMPLETE_FUNCTION_CALL: {
        pattern: /(\w+\.reply\([^)]*)\s*$/gm,
        description: 'Chiamata di funzione incompleta',
        fix: (match) => match.trim() + ')'
    }
};

/**
 * Analizza il codice e trova errori comuni
 */
export function analyzeCode(code, filePath) {
    const errors = [];
    const fixes = [];
    
    for (const [errorType, config] of Object.entries(ERROR_PATTERNS)) {
        const matches = [...code.matchAll(config.pattern)];
        
        for (const match of matches) {
            const lineNumber = code.substring(0, match.index).split('\n').length;
            
            errors.push({
                type: errorType,
                description: config.description,
                line: lineNumber,
                match: match[0],
                index: match.index
            });
            
            // Genera la correzione
            const fixedText = config.fix(match[0], ...match.slice(1));
            if (fixedText !== match[0]) {
                fixes.push({
                    type: errorType,
                    original: match[0],
                    fixed: fixedText,
                    index: match.index,
                    line: lineNumber
                });
            }
        }
    }
    
    return { errors, fixes };
}

/**
 * Applica le correzioni automatiche al codice
 */
export function applyAutoFixes(code, fixes) {
    let fixedCode = code;
    let totalOffset = 0;
    
    // Ordina le correzioni per indice (dal fondo verso l'inizio)
    const sortedFixes = fixes.sort((a, b) => b.index - a.index);
    
    for (const fix of sortedFixes) {
        const startIndex = fix.index;
        const endIndex = startIndex + fix.original.length;
        
        fixedCode = fixedCode.substring(0, startIndex) + 
                   fix.fixed + 
                   fixedCode.substring(endIndex);
    }
    
    return fixedCode;
}

/**
 * Valida che il codice corretto sia sintatticamente valido
 */
export async function validateFixedCode(code, filePath) {
    try {
        // Crea un file temporaneo in una directory temporanea del sistema
        const os = await import('os');
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `validation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.js`);
        
        await fs.promises.writeFile(tempFile, code);
        
        // Testa la sintassi con Node.js
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        try {
            await execAsync(`node --check "${tempFile}"`);
            // Pulizia del file temporaneo
            await fs.promises.unlink(tempFile).catch(() => {}); // Ignora errori di cleanup
            return { valid: true };
        } catch (error) {
            // Pulizia del file temporaneo
            await fs.promises.unlink(tempFile).catch(() => {}); // Ignora errori di cleanup
            return { 
                valid: false, 
                error: error.message 
            };
        }
    } catch (error) {
        return { 
            valid: false, 
            error: `Validation failed: ${error.message}` 
        };
    }
}

/**
 * Funzione principale per auto-correggere un file
 */
export async function autoFixFile(filePath) {
    try {
        // Leggi il file originale
        const originalCode = await fs.promises.readFile(filePath, 'utf8');
        
        // Analizza gli errori
        const analysis = analyzeCode(originalCode, filePath);
        
        if (analysis.fixes.length === 0) {
            return {
                success: false,
                reason: 'No fixable errors found',
                errors: analysis.errors
            };
        }
        
        // Applica le correzioni
        const fixedCode = applyAutoFixes(originalCode, analysis.fixes);
        
        // Valida il codice corretto
        const validation = await validateFixedCode(fixedCode, filePath);
        
        if (!validation.valid) {
            return {
                success: false,
                reason: 'Fixed code is still invalid',
                validationError: validation.error,
                fixes: analysis.fixes
            };
        }
        
        // Crea backup del file originale
        const backupPath = filePath + '.backup.' + Date.now();
        await fs.promises.copyFile(filePath, backupPath);
        
        // Scrivi il file corretto
        await fs.promises.writeFile(filePath, fixedCode);
        
        return {
            success: true,
            fixesApplied: analysis.fixes,
            backupPath: backupPath,
            originalCode: originalCode,
            fixedCode: fixedCode
        };
        
    } catch (error) {
        return {
            success: false,
            reason: 'Auto-fix failed',
            error: error.message
        };
    }
}

/**
 * Pattern specifici per errori JavaScript/ES6 comuni
 */
export const JS_SPECIFIC_FIXES = {
    // Function senza return
    addMissingReturn: (code) => {
        return code.replace(
            /function\s+\w+\([^)]*\)\s*{\s*([^}]+)\s*}/g,
            (match, body) => {
                if (!body.includes('return') && !body.includes('console') && !body.includes('throw')) {
                    return match.replace(body, body + '\n    return;');
                }
                return match;
            }
        );
    },
    
    // Arrow function malformate
    fixArrowFunctions: (code) => {
        return code.replace(
            /(\w+)\s*=>\s*([^{][^;]*)\n/g,
            '$1 => $2;\n'
        );
    }
};