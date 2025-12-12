import csv
import io
import time

import numpy as np
import streamlit as st
from PIL import Image
from streamlit_drawable_canvas import st_canvas

from softagar.engine import detect_colonies

NAV_LOCKOUT_SECONDS = 0.75

# Initialize session state variables
def init_session_state():
    if 'uploaded_files' not in st.session_state:
        st.session_state.uploaded_files = []
    if 'results' not in st.session_state:
        st.session_state.results = {} # Maps file index (int) to count (int)
    if 'current_file_index' not in st.session_state:
        st.session_state.current_file_index = 0
    if 'processing_complete' not in st.session_state:
        st.session_state.processing_complete = False
    if 'canvas_ready_at' not in st.session_state:
        st.session_state.canvas_ready_at = 0.0
    if 'canvas_ready_index' not in st.session_state:
        st.session_state.canvas_ready_index = -1

def next_image():
    if st.session_state.current_file_index < len(st.session_state.uploaded_files) - 1:
        st.session_state.current_file_index += 1
    else:
        st.session_state.processing_complete = True

def prev_image():
    if st.session_state.current_file_index > 0:
        st.session_state.current_file_index -= 1
        st.session_state.processing_complete = False

def reset_app():
    st.session_state.uploaded_files = []
    st.session_state.results = {}
    st.session_state.current_file_index = 0
    st.session_state.processing_complete = False
    st.session_state.canvas_ready_at = 0.0
    st.session_state.canvas_ready_index = -1

def export_results():
    csv_data = io.StringIO()
    writer = csv.writer(csv_data)
    writer.writerow(["Filename", "Count"])
    # Iterate through uploaded files by index to maintain order and handle duplicates
    for i, file in enumerate(st.session_state.uploaded_files):
        count = st.session_state.results.get(i, "Not Counted")
        writer.writerow([file.name, count])
    return csv_data.getvalue()

# Streamlit app
st.set_page_config(page_title="Colony Counter", layout="wide")
st.title("Colony Counter")

# Initialize session state
init_session_state()

# Sidebar for controls
with st.sidebar:
    st.header("Controls")
    
    # Reset button
    if st.button("Reset App", type="primary"):
        reset_app()
        st.rerun()

    # File uploader
    uploaded_files = st.file_uploader("Choose images...", type=["jpg", "jpeg", "png", "tif"], accept_multiple_files=True)
    
    if uploaded_files:
        # Update session state with uploaded files if they differ
        # Note: This simple check might not be enough if the user re-uploads the same files, 
        # but standard Streamlit behavior usually handles this. 
        # We replace the list to ensure we have the current selection.
        st.session_state.uploaded_files = uploaded_files
    
    if st.session_state.uploaded_files:
        st.header("Parameters")
        global_thresh_val = st.slider("Global Thresholding Value", 0, 255, 127)
        adaptive_block_size = st.slider("Adaptive Thresholding Block Size", 3, 51, 21, step=2)
        adaptive_c_val = st.slider("Adaptive Thresholding C Value", 0, 20, 4)
        kernel_size = st.slider("Kernel Size for Morphological Operations", 1, 7, 3)
        open_iterations = st.slider("Opening Iterations", 0, 10, 2)
        close_iterations = st.slider("Closing Iterations", 0, 10, 6)
        min_area = st.slider("Min Area", 0, 5000, 525)
        max_area = st.slider("Max Area", 500, 20000, 15000)
        clahe_clip_limit = st.slider("CLAHE Clip Limit", 1.0, 10.0, 2.0, 0.1)
        clahe_tile_grid_size = st.slider("CLAHE Tile Grid Size", 2, 16, 8, 1)
        drawing_mode = st.selectbox("Choose Drawing Mode:", ["Add Colonies", "Remove Colonies"])

# Main Content
if st.session_state.uploaded_files:
    try:
        # If we are past the last image, show completion
        if st.session_state.processing_complete and st.session_state.current_file_index >= len(st.session_state.uploaded_files) - 1:
             # Display completion message
            st.info("⚠️ All images have been processed. Please save your results using the button below.")
            
            # Navigation to review
            if st.button("Review Previous Image"):
                prev_image()
                st.rerun()

            # Only show export button
            if st.download_button(
                label="Save & Export Results",
                data=export_results(),
                file_name="colony_counts.csv",
                mime="text/csv"
            ):
                st.success("Results exported successfully!")
                
        else:
            # Ensure index is within bounds
            idx = st.session_state.current_file_index
            if idx < 0: idx = 0
            if idx >= len(st.session_state.uploaded_files): idx = len(st.session_state.uploaded_files) - 1
            st.session_state.current_file_index = idx
            if st.session_state.canvas_ready_index != idx:
                st.session_state.canvas_ready_index = idx
                st.session_state.canvas_ready_at = time.time()

            current_file = st.session_state.uploaded_files[idx]
            
            # Load and process image
            # Convert to RGB ensures we handle Grayscale, RGBA, and Palette (P) images consistently
            img = Image.open(current_file).convert('RGB')
            img_array = np.array(img)

            result = detect_colonies(
                img_array,
                global_thresh=global_thresh_val,
                adaptive_block_size=adaptive_block_size,
                adaptive_C=adaptive_c_val,
                morph_kernel_size=kernel_size,
                opening_iterations=open_iterations,
                closing_iterations=close_iterations,
                min_area=min_area,
                max_area=max_area,
                clahe_clip_limit=clahe_clip_limit,
                clahe_tile_grid_size=clahe_tile_grid_size,
            )

            closing_image = result["mask"]
            pil_image = Image.fromarray(result["annotated"])
            pil_closing_image = Image.fromarray(closing_image)
            count = result["count"]

            # Set drawing colors
            stroke_color = "#e00" if drawing_mode == "Add Colonies" else "#00e"
            fill_color = "rgba(255, 165, 0, 0.3)" if drawing_mode == "Add Colonies" else "rgba(0, 0, 255, 0.3)"

            # Display images
            col1, col2 = st.columns(2)
            with col1:
                st.image(pil_closing_image, caption="Machine Vision", use_column_width=True)
            with col2:
                st.image(pil_image, caption=f"Annotated Image ({current_file.name})", use_column_width=True)

            # Canvas for drawing
            # We need a unique key for the canvas to reset when the image changes.
            # Use a stable key per image to avoid re-registering background media unnecessarily.
            canvas_result = st_canvas(
                fill_color=fill_color,
                stroke_width=2,
                stroke_color=stroke_color,
                background_image=pil_image,
                update_streamlit=True,
                height=400,
                drawing_mode='circle',
                key=f"canvas_{st.session_state.current_file_index}",
            )

            # Count circles from manual annotation
            add_count = 0
            remove_count = 0
            if canvas_result.json_data is not None:
                for obj in canvas_result.json_data["objects"]:
                    if obj["stroke"] == "#e00":
                        add_count += 1
                    elif obj["stroke"] == "#00e":
                        remove_count += 1

            final_count = count + add_count - remove_count

            # Update results for current file immediately
            st.session_state.results[idx] = final_count

            # Display counts
            st.write(f"**Detected Colonies:** {count}")
            st.write(f"**Added Colonies:** {add_count}")
            st.write(f"**Removed Colonies:** {remove_count}")
            st.write(f"### Final Count: {final_count}")

            # Show progress
            total_files = len(st.session_state.uploaded_files)
            st.progress((idx + 1) / total_files)
            st.write(f"Processing image {idx + 1} of {total_files}: {current_file.name}")

            # Navigation Buttons
            col1, col2, col3 = st.columns([1, 1, 2])
            
            with col1:
                if st.button("Previous Image", disabled=(idx == 0)):
                    prev_image()
                    st.rerun()
            
            with col2:
                # Change button label based on position
                btn_label = "Save & Next Image" if idx < total_files - 1 else "Save & Finish"
                nav_locked = (time.time() - st.session_state.canvas_ready_at) < NAV_LOCKOUT_SECONDS
                if st.button(btn_label, type="primary", disabled=nav_locked):
                    # Results are already saved in st.session_state.results above
                    next_image()
                    st.rerun()
                if nav_locked:
                    st.caption("Canvas is syncing… please release the button to continue.")
            
            with col3:
                if st.download_button(
                    label="Export Current Results (CSV)",
                    data=export_results(),
                    file_name="colony_counts.csv",
                    mime="text/csv"
                ):
                    st.success("Results exported!")

    except Exception as e:
        st.error(f"Error processing file: {st.session_state.uploaded_files[st.session_state.current_file_index].name}")
        st.error(f"Details: {str(e)}")
        # Add an option to skip this file if it's broken
        if st.button("Skip this file"):
            next_image()
            st.rerun()

else:
    st.info("Please upload images in the sidebar to start counting colonies.")
