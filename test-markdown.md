# Rebuttal for Paper #123: "Advanced Deep Learning for Abstract Reasoning"

We thank the reviewers for their insightful feedback and constructive comments. We have addressed each point below and have revised the manuscript accordingly.

---

## Response to Reviewer 1

> The paper's main contribution seems to be an incremental improvement over existing methods. The novelty is not clearly articulated.

We respectfully disagree and have clarified the novelty in the revised **Section 3**. Our primary contribution is not just an incremental improvement in performance, but a new architectural paradigm, the *Recurrent Attention Module* (RAM), which is fundamentally different from prior work by Smith et al. [^1]. The RAM module allows for dynamic adjustment of receptive fields, a feature absent in previous models.

### Performance Comparison

To further highlight the significance of our method, we present a more detailed comparison table:

| Model | Accuracy (%) | Parameters (M) | Inference Time (ms) |
| :--- | :---: | :---: | :---: |
| Baseline (Smith et al.) | 85.2 | 12.4 | 150 |
| Our Model (with RAM) | **89.7** | **10.1** | 125 |
| Ablation: No RAM | 85.9 | 9.5 | 110 |

As shown, our model achieves a ~4.5% absolute improvement while being more parameter-efficient.

---

## Response to Reviewer 2

> The mathematical formulation in Equation (3) is unclear. Specifically, the definition of the attention weights wij is ambiguous.

We apologize for the lack of clarity. We have rewritten the section for better readability. The attention weights wij are calculated using a scaled dot-product attention mechanism, similar to Vaswani et al. [^2], but with an added locality bias.

The updated formulation is:
$$
w_{ij} = \frac{\exp(e_{ij})}{\sum_{k=1}^{N} \exp(e_{ik})} \quad \text{where} \quad e_{ij} = \frac{(Q_i K_j^T)}{\sqrt{d_k}} + b_{|i-j|}
$$
Here, Q is the query, K is the key, and b is a learnable bias term dependent on the distance between elements i and j. This encourages the model to focus on local context, which is crucial for our task.

### Chemical Formula Example
Our model can also handle complex symbolic representations like chemical formulas, such as $$H_2O$$ (Water) or $$C_8H_10N_4O_2$$ (Caffeine). This is a test of subscript rendering. The famous equation by Einstein, $$ E=mc^2 $$, is a test for superscript.

---

## Response to Reviewer 3

> The experimental setup is not reproducible. Please provide more details about the dataset and the code.

We agree and have added a new appendix with detailed instructions. We will also release our code and pre-trained models upon publication. Here is a snippet of the training loop for reference:

```python
def train_epoch(model, dataloader, optimizer):
    model.train()
    total_loss = 0
    for batch in dataloader:
        optimizer.zero_grad()
        # Forward pass: y_pred = model(x)
        output = model(batch['input_ids'], attention_mask=batch['attention_mask'])
        loss = criterion(output, batch['labels'])
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    return total_loss / len(dataloader)
```

We hope these revisions and clarifications adequately address the reviewers' concerns. We believe the updated manuscript is significantly stronger and makes a valuable contribution to the field.

---
### Footnotes & Abbreviation bla bla

[^1]: Smith, J., & Doe, A. (2022). *Foundations of Modern AI*. AI Press.
[^2]: Vaswani, A., et al. (2017). *Attention Is All You Need*. NeurIPS.

*[RAM]: Recurrent Attention Module
*[NeurIPS]: Conference on Neural Information Processing Systems