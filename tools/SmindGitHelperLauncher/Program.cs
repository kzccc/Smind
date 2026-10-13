using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

public static class Program
{
    private const string Host = "127.0.0.1";
    private const int Port = 32123;
    private const string Node = @"C:\Program Files\nodejs\node.exe";
    private const string Script = @"D:\Smind\tools\git-push-server.js";

    [STAThread]
    public static void Main()
    {
        try
        {
            if (IsListening())
            {
                MessageBox.Show("Smind Git Helper 已经在运行。", "Smind", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
            if (!File.Exists(Node) || !File.Exists(Script))
            {
                MessageBox.Show("找不到 Node.js 或 Smind helper 文件。", "Smind", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            Process.Start(new ProcessStartInfo
            {
                FileName = Node,
                Arguments = "\"" + Script + "\"",
                WorkingDirectory = @"D:\Smind",
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            });
            Thread.Sleep(700);
            MessageBox.Show(IsListening() ? "Smind Git Helper 已启动。" : "Smind Git Helper 启动失败，请检查日志。", "Smind", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception error)
        {
            MessageBox.Show(error.Message, "Smind Git Helper", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private static bool IsListening()
    {
        try
        {
            using (var client = new TcpClient())
            {
                var task = client.BeginConnect(Host, Port, null, null);
                return task.AsyncWaitHandle.WaitOne(400) && client.Connected;
            }
        }
        catch { return false; }
    }
}
