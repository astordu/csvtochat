import { codeInterpreter } from "@/lib/clients";
import { CodeInterpreterExecuteParams } from "together-ai/resources.mjs";
import { localUploadService } from "./local-upload";

interface CodeInterpreterOutput {
  type: string;
  data: string;
}

interface CodeInterpreterError {
  // Define error structure if available from the API, otherwise use any
  message: string;
}

export interface TogetherCodeInterpreterResponseData {
  session_id: string;
  status: string;
  outputs: CodeInterpreterOutput[];
  errors?: CodeInterpreterError[];
}

interface RunPythonResult {
  session_id: string | null;
  status: string;
  outputs: CodeInterpreterOutput[];
  errors?: CodeInterpreterError[];
  error_message?: string;
}

/**
 * Downloads file content from local file URL and returns it as a string
 * @param fileUrl The local file URL (e.g., "/api/files/filename.csv")
 * @returns The file content as a string
 */
async function downloadFileContent(fileUrl: string): Promise<string> {
  try {
    // Extract filename from URL
    const filename = fileUrl.split('/').pop();
    if (!filename) {
      throw new Error('Invalid file URL');
    }
    
    // Get file content from local storage
    const fileBuffer = await localUploadService.getFile(filename);
    if (!fileBuffer) {
      throw new Error('File not found');
    }
    
    return fileBuffer.toString('utf-8');
  } catch (error) {
    throw new Error(`Failed to download file: ${error}`);
  }
}

/**
 * Processes code to replace local file URLs with file content
 * @param code The Python code to process
 * @returns Processed code with file content embedded
 */
async function processCodeWithFiles(code: string): Promise<string> {
  // Look for patterns like pd.read_csv("/api/files/filename.csv")
  const fileUrlPattern = /\/api\/files\/[^"'\s)]+/g;
  const matches = code.match(fileUrlPattern);
  
  if (!matches) {
    return code;
  }
  
  let processedCode = code;
  
  for (const fileUrl of matches) {
    try {
      const fileContent = await downloadFileContent(fileUrl);
      const filename = fileUrl.split('/').pop();
      
      // Create a temporary variable with the file content
      const tempVarName = `csv_data_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add the file content as a variable at the beginning
      // Use raw string to avoid escaping issues
      const fileContentVar = `${tempVarName} = """${fileContent}"""\n`;
      
      // Replace the file URL with the variable
      // Use a more precise replacement that handles quotes properly
      const quotedUrl = `"${fileUrl}"`;
      processedCode = processedCode.replace(quotedUrl, `StringIO(${tempVarName})`);
      
      // Add file content variable at the beginning
      processedCode = fileContentVar + processedCode;
      
      // Add imports at the very beginning
      if (!processedCode.includes('from io import StringIO') && !processedCode.includes('import StringIO')) {
        processedCode = `from io import StringIO\n${processedCode}`;
      }
    } catch (error) {
      console.error(`Failed to process file ${fileUrl}:`, error);
      // Keep the original URL if processing fails
    }
  }
  
  return processedCode;
}

/**
 * Executes Python code using Together Code Interpreter and returns the result.
 * @param code The Python code to execute
 * @param session_id Optional session ID to maintain state between executions
 * @param files Optional list of files to upload to the code interpreter
 *              Each file should be an object with 'name', 'encoding', and 'content' keys
 * @returns The output of the executed code as a JSON
 */
export async function runPython(
  code: string,
  session_id?: string,
  files?: Array<{ name: string; encoding: string; content: string }>
): Promise<RunPythonResult> {
  try {
    // Process code to handle local file URLs
    const processedCode = await processCodeWithFiles(code);
    
    
    const kwargs: CodeInterpreterExecuteParams = { code: processedCode, language: "python" };

    if (session_id) {
      kwargs.session_id = session_id;
    }

    if (files) {
      // kwargs.files = files;
    }

    const response = await codeInterpreter.execute(kwargs);

    const data = response.data as TogetherCodeInterpreterResponseData;

    console.log("Response data:");
    console.dir(data);

    const result: RunPythonResult = {
      session_id: data.session_id || null,
      status: data.status || "unknown",
      outputs: [],
    };

    if (data.outputs) {
      for (const output of data.outputs) {
        result.outputs.push({ type: output.type, data: output.data });
      }
    }

    if (data.errors) {
      result.errors = data.errors;
    }

    return result;
  } catch (e: any) {
    const error_result: RunPythonResult = {
      status: "error",
      error_message: e.message || String(e),
      session_id: null,
      outputs: [],
    };
    return error_result;
  }
}
