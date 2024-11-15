import { BuildHook, IBuildResult, ITaskOptions } from '../@types';
import { PACKAGE_NAME } from './global';
import JSZip from 'jszip';
import { writeFileSync, promises as fsPromises } from 'fs';
import path from 'path';

function log(...arg: any[]) {
    return console.log(`[${PACKAGE_NAME}] `, ...arg);
}

let allAssets = [];

export const throwError: BuildHook.throwError = true;

export const load: BuildHook.load = async function() {
    console.log(`[${PACKAGE_NAME}] Load cocos plugin example in builder.`);
    allAssets = await Editor.Message.request('asset-db', 'query-assets');
};

export const onBeforeBuild: BuildHook.onBeforeBuild = async function(options: ITaskOptions, result: IBuildResult) {
    console.log(`onBeforeBuild`);
};

export const onBeforeCompressSettings: BuildHook.onBeforeCompressSettings = async function(options: ITaskOptions, result: IBuildResult) {};

export const onAfterCompressSettings: BuildHook.onAfterCompressSettings = async function(options: ITaskOptions, result: IBuildResult) {};

// Папка, содержащая файлы билда (указываем правильный путь к билду)
const buildDir = path.join(__dirname, '..', '..', '..', 'build', 'output', 'game');  // Замените на правильный путь к вашему билду
const scriptPath = path.join(__dirname, '..', 'service-worker.js');
const pagePath = path.join(__dirname, '..', 'index.html');

// Функция для рекурсивного получения всех файлов в папке
async function getFilesFromDirectory(dir: string): Promise<string[]> {
    const files = await fsPromises.readdir(dir);
    const filePaths: string[] = [];

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fsPromises.stat(fullPath);

        if (stat.isDirectory()) {
            // Если это директория, рекурсивно добавляем ее файлы
            const subFiles = await getFilesFromDirectory(fullPath);
            filePaths.push(...subFiles);
        } else {
            // Если это файл, добавляем его в список
            filePaths.push(fullPath);
        }
    }

    return filePaths;
}

// Функция для удаления всех файлов и папок в buildDir, кроме build.zip
async function cleanBuildDirectory() {
    const files = await fsPromises.readdir(buildDir);

    for (const file of files) {
        const fullPath = path.join(buildDir, file);

        // Не удаляем сам архив build.zip
        if (file !== 'build.zip') {
            const stat = await fsPromises.stat(fullPath);
            if (stat.isDirectory()) {
                // Удаляем директорию рекурсивно
                await fsPromises.rm(fullPath, { recursive: true, force: true });
                console.log(`Удалена директория: ${fullPath}`);
            } else {
                // Удаляем файл
                await fsPromises.unlink(fullPath);
                console.log(`Удален файл: ${fullPath}`);
            }
        }
    }
}

// Функция для копирования скрипта и страницы в папку билда
async function copyFilesToBuildDir() {
    try {
        await fsPromises.copyFile(scriptPath, path.join(buildDir, 'service-worker.js'));
        console.log(`Скрипт скопирован в ${path.join(buildDir, 'service-worker.js')}`);

        await fsPromises.copyFile(pagePath, path.join(buildDir, 'index.html'));
        console.log(`Страница index.html скопирована в ${path.join(buildDir, 'index.html')}`);
    } catch (error) {
        console.error('Ошибка при копировании файлов:', error);
    }
}

export const onAfterBuild: BuildHook.onAfterBuild = async function(options: ITaskOptions, result: IBuildResult) {
    console.log(`onAfterBuild`);

    // Получаем все файлы из папки билда
    const filePaths = await getFilesFromDirectory(buildDir);

    // Создаем новый архив
    const zip = new JSZip();

    // Перебираем все файлы и добавляем их в архив
    for (const filePath of filePaths) {
        try {
            const fileContent = await fsPromises.readFile(filePath);
            const relativePath = path.relative(buildDir, filePath);  // Получаем относительный путь файла

            // Добавляем файл в архив
            zip.file(relativePath, fileContent);
        } catch (error) {
            console.error(`Не удалось добавить файл ${filePath} в архив`, error);
        }
    }

    // Теперь архивируем и сохраняем его как build.zip
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    // Сохраняем архив в папке билда
    const zipPath = path.join(buildDir, 'build.zip');
    writeFileSync(zipPath, zipContent);

    console.log(`Архив build.zip создан успешно в ${zipPath}`);

    // Очищаем папку с билдом, кроме архива
    await cleanBuildDirectory();

    // Копируем необходимые файлы (index.html и service-worker.js)
    await copyFilesToBuildDir();
};

export const unload: BuildHook.unload = async function() {
    console.log(`[${PACKAGE_NAME}] Unload cocos plugin example in builder.`);
};

export const onError: BuildHook.onError = async function(options, result) {
    console.warn(`${PACKAGE_NAME} run onError`);
};

export const onBeforeMake: BuildHook.onBeforeMake = async function(root, options) {
    console.log(`onBeforeMake: root: ${root}, options: ${options}`);
};

export const onAfterMake: BuildHook.onAfterMake = async function(root, options) {
    console.log(`onAfterMake: root: ${root}, options: ${options}`);
};
