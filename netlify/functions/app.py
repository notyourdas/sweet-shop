"""
Netlify Serverless Function adapter for MithAI Sweet Shop Flask app.
This enables Netlify to run the Flask application using AWS Lambda/Netlify Functions runtime.
"""
import sys
import os

# Add root directory to path to import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

try:
    import serverless_wsgi
    from app import app

    def handler(event, context):
        try:
            return serverless_wsgi.handle_request(app, event, context)
        except Exception as e:
            import json
            return {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"status": "error", "message": str(e)})
            }

except ImportError as ie:
    import json
    def handler(event, context):
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "status": "ready",
                "message": f"MithAI Sweet Shop Netlify Function Ready. Note: {str(ie)}"
            })
        }
